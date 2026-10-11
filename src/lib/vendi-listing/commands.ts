/**
 * Vendi — natural corrections, undo and questions.
 *
 * A seller must never have to restart, or wait for the "right" question, to fix
 * something. At any point they can say "change the price to 119k", "remove the
 * generator", "actually it's in North Charleston, SC", "I don't want delivery",
 * "undo that", "what do you have for the price?" or "what's missing?".
 *
 * Hard rules, unchanged from the rest of Vendi:
 *  - Only explicitly stated facts are written. Nothing is inferred.
 *  - An ambiguous correction produces a question, never a silent write.
 */
import { cleanText, parseLocation, parseMoney } from './extract';
import {
  categoryLabel, CATEGORY_OPTIONS, getPublishBlockers, isMobileAsset, type VendiDraft,
} from './script';
import { reconcileChange } from './reconcile';

export type VendiCommand =
  | {
    kind: 'edit';
    patch: Partial<VendiDraft>;
    /** What Vendi says back, confirming the change in plain language. */
    ack: string;
    /** Questions this correction re-opens (mode / category switches). */
    dropAnswered?: string[];
    /** Questions this correction satisfies. */
    answeredIds?: string[];
    /** Low-cardinality field names, for analytics only. */
    fields: string[];
  }
  | { kind: 'undo' }
  | { kind: 'answer'; text: string }
  | null;

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

const RATE_FIELD: Record<string, keyof VendiDraft> = {
  month: 'price_monthly', week: 'price_weekly', day: 'price_daily', hour: 'price_hourly',
};

/** "119k", "$119,000", "119000" → 119000. Only when a number is actually written. */
const amountIn = (text: string): number | null => parseMoney(text);

const EDIT_LEAD = /^(?:ok(?:ay)?,?\s*)?(?:actually,?\s*|wait,?\s*|sorry,?\s*|no,?\s*)?(?:can you\s*|please\s*|i want to\s*|let'?s\s*)?/i;

const stripLead = (raw: string) => cleanText(raw).replace(EDIT_LEAD, '').trim();

const listWithout = (list: string[] | undefined | null, term: string): string[] | null => {
  if (!list?.length) return null;
  const lower = term.toLowerCase();
  const kept = list.filter((item) => !item.toLowerCase().includes(lower));
  return kept.length === list.length ? null : kept;
};

/** A compact answer to "what do you have for X?" — confirmed facts only. */
export function describeField(draft: VendiDraft, field: string): string {
  const f = field.toLowerCase();
  if (/price|asking|rate|rent|cost/.test(f)) {
    if (draft.price_sale) return `Your asking price is ${money(draft.price_sale)}.`;
    const rates = [
      draft.price_monthly && `${money(draft.price_monthly)}/month`,
      draft.price_weekly && `${money(draft.price_weekly)}/week`,
      draft.price_daily && `${money(draft.price_daily)}/day`,
      draft.price_hourly && `${money(draft.price_hourly)}/hour`,
    ].filter(Boolean) as string[];
    return rates.length ? `Your rate is ${rates.join(' · ')}.` : 'I don’t have a price yet.';
  }
  if (/location|city|where|state/.test(f)) {
    return draft.city && draft.state
      ? `It’s listed in ${draft.city}, ${draft.state}.`
      : 'I don’t have a location yet.';
  }
  if (/title|headline/.test(f)) return draft.title ? `Your title is “${draft.title}”.` : 'No title yet.';
  if (/description/.test(f)) return draft.description ? `Your description: ${draft.description}` : 'No description yet.';
  if (/equipment|amenit|feature|include/.test(f)) {
    return draft.amenities?.length ? `Equipment: ${draft.amenities.join(', ')}.` : 'No equipment listed yet.';
  }
  if (/highlight/.test(f)) {
    return draft.highlights?.length ? `Highlights: ${draft.highlights.join(', ')}.` : 'No highlights yet.';
  }
  if (/deposit/.test(f)) {
    return draft.deposit_amount ? `Security deposit: ${money(draft.deposit_amount)}.` : 'No deposit set.';
  }
  if (/deliver|pickup|handoff/.test(f)) {
    return draft.fulfillment_type ? `Handoff: ${draft.fulfillment_type.replace('_', ' ')}.` : 'No handoff preference yet.';
  }
  return summariseDraft(draft);
}

/** Everything Vendi currently holds, in one readable paragraph. */
export function summariseDraft(draft: VendiDraft): string {
  const parts: string[] = [];
  const label = categoryLabel(draft);
  if (label) parts.push(`${draft.mode === 'rent' ? 'Renting out' : draft.mode === 'sale' ? 'Selling' : 'Listing'} a ${label}`);
  if (draft.city && draft.state) parts.push(`in ${draft.city}, ${draft.state}`);
  if (draft.price_sale) parts.push(`asking ${money(draft.price_sale)}`);
  if (draft.price_monthly) parts.push(`${money(draft.price_monthly)}/month`);
  if (draft.title) parts.push(`titled “${draft.title}”`);
  if (draft.amenities?.length) parts.push(`with ${draft.amenities.join(', ')}`);
  return parts.length ? `Here’s what I have: ${parts.join(', ')}.` : 'I don’t have anything saved yet.';
}

/** "What still needs doing" — the authoritative publish blockers, verbatim. */
export function describeMissing(draft: VendiDraft, imageCount: number): string {
  const blockers = getPublishBlockers(draft, imageCount);
  if (!blockers.length) {
    return 'Nothing is missing — your listing can publish. I can still help you strengthen it.';
  }
  return `Still needed before you can publish:\n${blockers.map((b) => `• ${b}`).join('\n')}`;
}

/**
 * Interpret a free-text message as a correction, an undo, or a question.
 * Returns `null` when the message is a normal answer to the current question.
 */
export function parseCommand(raw: string, draft: VendiDraft, imageCount = 0): VendiCommand {
  const original = cleanText(raw);
  if (!original) return null;
  const text = stripLead(original);
  const lower = text.toLowerCase();

  // ── Undo / go back ────────────────────────────────────────────────────
  if (/^(undo|undo that|go back|back|scratch that|revert)\b\.?$/i.test(lower)) return { kind: 'undo' };

  // ── Questions ─────────────────────────────────────────────────────────
  if (/^(what'?s|what is|show me what'?s|whats)\s+(missing|left|needed|still needed)/i.test(lower)
    || /^show me what'?s missing/i.test(lower)) {
    return { kind: 'answer', text: describeMissing(draft, imageCount) };
  }
  const query = lower.match(/^(?:what|which)\s+(?:do you have|did i say|have i said|is|are)?\s*(?:for|about|the|my)?\s*([a-z ]+)\??$/);
  if (query) return { kind: 'answer', text: describeField(draft, query[1]) };
  if (/^(what do you have|what have you got|recap|summary|show me the listing)\b/i.test(lower)) {
    return { kind: 'answer', text: summariseDraft(draft) };
  }

  const isEditVerb = /^(change|set|update|correct|fix|make|remove|drop|delete|take off|add|include|rename)\b/i.test(lower)
    || /^(actually|it'?s|its|i don'?t want|i do not want|no )/i.test(cleanText(original).toLowerCase());

  // ── Price ─────────────────────────────────────────────────────────────
  const priceEdit = lower.match(/\b(price|asking|rate|rent|cost)\b[^0-9$]*([$0-9][\d.,]*\s*k?)/i);
  if (priceEdit) {
    const value = amountIn(priceEdit[2]);
    if (!value) return null;
    const period = lower.match(/per\s*(month|week|day|hour)|\/\s*(mo|wk|day|hr)|(monthly|weekly|daily|hourly)|a\s*(month|week|day|hour)/);
    if (draft.mode === 'rent' || period) {
      const key = period
        ? RATE_FIELD[(period[1] ?? period[4] ?? (period[3] ?? '').replace(/ly$/, '').replace('dai', 'day') ?? 'month')
          .replace('mo', 'month').replace('wk', 'week').replace('hr', 'hour')] ?? 'price_monthly'
        : (draft.rent_period ? RATE_FIELD[draft.rent_period.replace('ly', '').replace('dai', 'day')] ?? 'price_monthly' : 'price_monthly');
      return {
        kind: 'edit',
        patch: { [key]: value } as Partial<VendiDraft>,
        ack: `Updated — ${money(value)} ${String(key).replace('price_', '').replace('ly', '')}ly rate.`.replace('monthlyly', 'monthly'),
        answeredIds: ['rent_price', 'rent_period'],
        fields: [String(key)],
      };
    }
    return {
      kind: 'edit',
      patch: { price_sale: value },
      ack: `Updated — your asking price is now ${money(value)}.`,
      answeredIds: ['sale_price'],
      fields: ['price_sale'],
    };
  }

  // ── Location ──────────────────────────────────────────────────────────
  const locEdit = original.match(/\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2}),\s*([A-Z]{2})\b(?:\s+(\d{5}))?/);
  if (locEdit && (/\b(in|located|location|city|move|moved)\b/i.test(lower) || /^(actually|it'?s|its)\b/i.test(lower))) {
    const loc = parseLocation(locEdit[0]);
    if (loc.city && loc.state) {
      return {
        kind: 'edit',
        patch: { city: loc.city, state: loc.state, zip_code: loc.zip_code, address: `${loc.city}, ${loc.state}` },
        ack: `Got it — moved to ${loc.city}, ${loc.state}.`,
        answeredIds: ['location'],
        fields: ['city', 'state'],
      };
    }
  }

  // ── Title / description rewrites (explicit text only) ─────────────────
  const titleEdit = text.match(/^(?:change|set|update|make|rename)\s+(?:the\s+)?title\s+(?:to|:)\s+(.{8,120})$/i);
  if (titleEdit) {
    const title = cleanText(titleEdit[1]).slice(0, 120);
    return { kind: 'edit', patch: { title }, ack: `Title updated: “${title}”.`, answeredIds: ['title'], fields: ['title'] };
  }
  const descEdit = text.match(/^(?:change|set|update|rewrite)\s+(?:the\s+)?description\s+(?:to|:)\s+([\s\S]{20,})$/i);
  if (descEdit) {
    const description = cleanText(descEdit[1]).slice(0, 4000);
    return {
      kind: 'edit', patch: { description }, ack: 'Description updated.',
      answeredIds: ['description'], fields: ['description'],
    };
  }

  // ── Delivery / handoff ────────────────────────────────────────────────
  if (/\b(no|don'?t|do not|not)\b.*\bdeliver/i.test(lower) && isMobileAsset(draft.category)) {
    return {
      kind: 'edit',
      patch: { fulfillment_type: 'pickup', delivery_fee: null, delivery_radius_miles: null, delivery_instructions: null },
      ack: 'Understood — pickup only. I removed the delivery details.',
      answeredIds: ['fulfillment'],
      dropAnswered: ['delivery_terms', 'delivery_instructions'],
      fields: ['fulfillment_type'],
    };
  }
  if (/^(i can deliver|i'?ll deliver|add delivery|i do deliver)/i.test(lower) && isMobileAsset(draft.category)) {
    return {
      kind: 'edit', patch: { fulfillment_type: 'both' },
      ack: 'Added delivery as an option alongside pickup.',
      answeredIds: ['fulfillment'], fields: ['fulfillment_type'],
    };
  }

  // ── Mode / category switches (reconciled, never left stale) ───────────
  const wantsRent = /\b(switch|change|make) (it |this )?(to )?(a )?(rent|rental|lease)\b/i.test(lower)
    || /^i want to rent it( out)?\b/i.test(lower);
  const wantsSale = /\b(switch|change|make) (it |this )?(to )?(a )?(sale|sell)\b/i.test(lower)
    || /^i want to sell it\b/i.test(lower);
  if ((wantsRent || wantsSale) && draft.mode) {
    const mode = wantsRent ? 'rent' : 'sale';
    if (mode !== draft.mode) {
      const r = reconcileChange(draft, { mode });
      return {
        kind: 'edit',
        patch: { mode, ...r.patch },
        ack: [`Switched to ${mode === 'rent' ? 'a rental' : 'a sale'}.`, ...r.warnings].join(' '),
        dropAnswered: r.dropAnswered,
        answeredIds: ['mode'],
        fields: ['mode'],
      };
    }
  }
  const catEdit = CATEGORY_OPTIONS.find((o) =>
    isEditVerb && new RegExp(`\\b${o.label.toLowerCase().replace(/\s+/g, '\\s+')}\\b`, 'i').test(lower));
  if (catEdit && draft.category && catEdit.value !== draft.category) {
    const r = reconcileChange(draft, { category: catEdit.value });
    return {
      kind: 'edit',
      patch: { category: catEdit.value, ...r.patch },
      ack: [`Changed the category to ${catEdit.label}.`, ...r.warnings].join(' '),
      dropAnswered: r.dropAnswered,
      answeredIds: ['category'],
      fields: ['category'],
    };
  }

  // ── Remove / add an equipment or highlight item ───────────────────────
  const removal = text.match(/^(?:remove|drop|delete|take off|no)\s+(?:the\s+)?(.{2,60})$/i);
  if (removal) {
    const term = cleanText(removal[1]).replace(/[.!]$/, '');
    const amenities = listWithout(draft.amenities, term);
    if (amenities) {
      return {
        kind: 'edit', patch: { amenities }, ack: `Removed ${term} from the equipment list.`, fields: ['amenities'],
      };
    }
    const highlights = listWithout(draft.highlights, term);
    if (highlights) {
      return {
        kind: 'edit', patch: { highlights }, ack: `Removed ${term} from the highlights.`, fields: ['highlights'],
      };
    }
  }
  const addition = text.match(/^(?:add|include)\s+(?:the\s+)?(.{2,60})$/i);
  if (addition && draft.amenities?.length) {
    const item = cleanText(addition[1]).replace(/[.!]$/, '');
    if (!draft.amenities.some((a) => a.toLowerCase() === item.toLowerCase())) {
      return {
        kind: 'edit',
        patch: { amenities: [...draft.amenities, item] },
        ack: `Added ${item} to the equipment list.`,
        fields: ['amenities'],
      };
    }
  }

  return null;
}
