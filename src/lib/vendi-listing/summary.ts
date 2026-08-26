/**
 * Vendi — "here's what I already have" summary.
 *
 * Friction rule: a seller must never wonder whether Vendi heard them, and must
 * never feel they have to repeat themselves. Every captured fact is rendered
 * back in plain language, tied to the question that produced it so one tap
 * reopens exactly that question — no scrolling back through the transcript.
 *
 * Only explicitly captured values appear here. Nothing is inferred, and an
 * empty field is simply absent rather than guessed.
 */
import { CATEGORY_LABELS, SUBCATEGORY_LABELS } from '@/types/listing';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';
import type { VendiDraft } from './script';

export interface CapturedFact {
  /** Interview question id — reopening it re-asks exactly this fact. */
  questionId: string;
  label: string;
  value: string;
}

const money = (n: number): string =>
  `$${Math.round(n).toLocaleString('en-US')}`;

const truncate = (s: string, max = 68): string =>
  (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

const RATE_LABEL: Array<[keyof VendiDraft, string]> = [
  ['price_monthly', '/mo'],
  ['price_weekly', '/wk'],
  ['price_daily', '/day'],
  ['price_hourly', '/hr'],
];

/**
 * Everything Vendi has confirmed so far, in the order a seller thinks about a
 * listing: what it is, where it is, what it costs, how it reads, what's shown.
 */
export function capturedFacts(
  draft: VendiDraft,
  imageCount = 0,
  videoCount = 0,
): CapturedFact[] {
  const facts: CapturedFact[] = [];
  const push = (questionId: string, label: string, value?: string | null) => {
    if (value) facts.push({ questionId, label, value });
  };

  push('category', 'Type', draft.category ? CATEGORY_LABELS[draft.category] ?? draft.category : null);
  push('mode', 'Listing', draft.mode === 'sale' ? 'For sale' : draft.mode === 'rent' ? 'For rent' : null);
  push('subcategory', 'Build', draft.subcategory ? SUBCATEGORY_LABELS[draft.subcategory] ?? draft.subcategory : null);
  push('location', 'Location', [draft.city, draft.state].filter(Boolean).join(', ') || null);

  if (draft.mode === 'sale' && draft.price_sale) {
    push('sale_price', 'Asking price', money(draft.price_sale));
  }
  if (draft.mode === 'rent') {
    const rates = RATE_LABEL
      .map(([key, suffix]) => {
        const v = draft[key];
        return typeof v === 'number' && v > 0 ? `${money(v)}${suffix}` : null;
      })
      .filter(Boolean)
      .join(' · ');
    push('rent_price', 'Rate', rates || null);
    if (draft.deposit_amount) push('deposit', 'Deposit', money(draft.deposit_amount));
  }

  push('title', 'Title', draft.title ? truncate(draft.title) : null);
  push('description', 'Description', draft.description ? truncate(draft.description) : null);
  if (draft.amenities?.length) {
    push('amenities', 'Equipment', `${draft.amenities.length} listed`);
  }
  if (draft.highlights?.length) {
    push('highlights', 'Highlights', `${draft.highlights.length} listed`);
  }
  if (draft.required_documents?.length) {
    push(
      'required_documents',
      'Screening',
      draft.required_documents.map((d) => DOCUMENT_TYPE_LABELS[d] ?? d).join(', '),
    );
  }
  if (imageCount || videoCount) {
    const media = [
      imageCount ? `${imageCount} photo${imageCount === 1 ? '' : 's'}` : null,
      videoCount ? `${videoCount} video${videoCount === 1 ? '' : 's'}` : null,
    ].filter(Boolean).join(' · ');
    push('photos', 'Media', media);
  }

  return facts;
}

/** One-line spoken recap, used when the seller asks what Vendi already has. */
export function capturedSummaryLine(facts: CapturedFact[]): string {
  if (!facts.length) return "I don't have anything saved yet — we'll start from your first answer.";
  return `Here's what I have so far:\n${facts.map((f) => `• ${f.label}: ${f.value}`).join('\n')}`;
}
