import { CONDITION_OPTIONS, LIEN_OPTIONS, READINESS_OPTIONS, TITLE_STATUS_OPTIONS } from './stages';

export type DisclosureKey = 'condition' | 'status' | 'title' | 'lien';

export interface Disclosure {
  key: DisclosureKey;
  label: string;
  value: string;
}

const STATUS_OPTIONS = [...READINESS_OPTIONS.drivable, ...READINESS_OPTIONS.towable, ...READINESS_OPTIONS.operational];

const labelFor = (options: readonly { value: string; label: string }[], value: unknown): string | null => {
  if (typeof value !== 'string' || !value || value === 'unknown' || value === 'not_sure') return null;
  return options.find((o) => o.value === value)?.label ?? null;
};

// Lien answers are phrased for sellers ("No lien — owned outright"); buyers
// get a short version.
const LIEN_BUYER_LABEL: Record<string, string> = { no: 'No lien', yes: 'Has a lien or loan' };

/**
 * Seller-declared disclosures for a sale listing, in buyer-facing words.
 * These are the questions buyers ask first (and the fields the wizard
 * collects) but they weren't shown anywhere on the listing page. "Not sure"
 * and unknown answers are omitted rather than shown as facts.
 */
export function saleDisclosures(listing: {
  condition?: string | null;
  operational_status?: string | null;
  title_status?: string | null;
  has_lien?: string | null;
} | null | undefined): Disclosure[] {
  if (!listing) return [];
  const out: Disclosure[] = [];
  const condition = labelFor(CONDITION_OPTIONS, listing.condition);
  if (condition) out.push({ key: 'condition', label: 'Condition', value: condition });
  const status = labelFor(STATUS_OPTIONS, listing.operational_status);
  if (status) out.push({ key: 'status', label: 'Running status', value: status });
  const title = labelFor(TITLE_STATUS_OPTIONS, listing.title_status);
  if (title) out.push({ key: 'title', label: 'Title', value: title });
  const lien = typeof listing.has_lien === 'string' ? LIEN_BUYER_LABEL[listing.has_lien] ?? null : null;
  if (lien) out.push({ key: 'lien', label: 'Lien', value: lien });
  return out;
}
