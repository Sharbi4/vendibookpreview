/**
 * Instant answers on the Contact page: as someone types what they need, show
 * the closest answers from Vendibook's reviewed support FAQ (atlasGuideFaq).
 * Grounded only in approved answers, never generated, so nothing is invented;
 * no match means no pop-up.
 */
import { GUIDE_FAQ, type GuideFaq } from '@/lib/atlas/atlasGuideFaq';

const STOP = new Set(['the', 'and', 'for', 'how', 'what', 'can', 'with', 'you', 'your', 'does', 'about', 'help', 'need', 'want', 'have', 'this', 'that', 'there', 'they', 'when', 'where', 'just', 'get', 'got', 'are', 'was', 'from', 'but', 'not', 'any', 'our', 'out', 'would', 'like', 'please', 'thanks', 'hi', 'hello', 'vendibook']);

const words = (s: string): string[] => Array.from(s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w: string) => w.length > 2 && !STOP.has(w));
/** "listings" matches "listing", "renting" matches "rent". */
const stem = (w: string) => w.replace(/(ing|ies|es|s|ed)$/, '') || w;

export interface InstantAnswer extends GuideFaq { score: number }

export function instantAnswers(query: string, limit = 2): InstantAnswer[] {
  const terms = [...new Set(words(query).map(stem))];
  if (terms.length < 2 && query.trim().length < 12) return [];
  return GUIDE_FAQ.map((f) => {
    const q = words(f.question).map(stem);
    const a = words(f.answer).map(stem);
    const score = terms.reduce((n, t) => n + (q.includes(t) ? 4 : 0) + (a.includes(t) ? 1 : 0), 0);
    return { ...f, score };
  })
    .filter((f) => f.score >= 6)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}
