import { evidencePrice, isUsableSaleComp, type ComparableRow } from '../marketComparables.ts';
import type { CompRecord } from './valuation.ts';

/** Use the same accepted evidence and price in the report and pricing math. */
export function observedSaleComp(row: ComparableRow): CompRecord | null {
  if (!isUsableSaleComp(row)) return null;
  const price = evidencePrice(row);
  if (price === null || price < 500) return null;
  const verified = row.transaction_price_verified === true &&
    Number.isFinite(Number(row.verified_transaction_price)) && Number(row.verified_transaction_price) > 0;
  return {
    id: row.id ?? '', title: row.source_title ?? 'Market comparable',
    city: row.city ?? null, state: row.state ?? null, year: row.year ?? null,
    make: row.make ?? null, model: row.model ?? null, lengthFt: row.length_ft ?? null,
    displayedPrice: price, previousDisplayedPrice: row.previous_displayed_price ?? null,
    observedStatus: row.observed_status === 'sold' || row.observed_status === 'pending' ? row.observed_status : 'active',
    evidenceType: verified ? 'vendibook_verified' : row.source === 'vendibook' ? 'vendibook_asking' : 'facebook_observed',
    evidenceConfidence: row.evidence_confidence ?? 0.5,
    features: row.normalized_features ?? {},
    qualityFlags: Array.isArray(row.quality_flags) ? row.quality_flags.filter((v): v is string => typeof v === 'string') : [],
  };
}
