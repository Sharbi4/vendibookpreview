/**
 * Buyer-facing equipment readiness summary.
 *
 * Every row is derived only from structured fields the seller has confirmed
 * (saved sections). Nothing is inferred, nothing is a VendiBook claim, and
 * rows that do not apply to the listing are omitted entirely.
 */

import { SpecValues, READINESS_DISCLAIMER } from './readiness';
import { readInventory } from './equipment';

export interface SummaryRow {
  label: string;
  value: string;
  /** True when the seller has not provided this yet. */
  unknown?: boolean;
}

export interface SummaryInput {
  category?: string | null;
  mode?: string | null;
  values: SpecValues;
  confirmedSections: string[];
  /** Public, summarized ownership facts only (never identifiers). */
  ownershipPublic?: Record<string, unknown> | null;
}

const str = (v: unknown): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'not sure') return null;
  return s;
};

const MOBILE = ['food_truck', 'food_trailer'];
const KITCHEN = ['food_truck', 'food_trailer', 'ghost_kitchen'];

export const UNKNOWN_LABEL = 'Not provided by the seller';

export const buildEquipmentSummary = ({
  category,
  mode,
  values,
  confirmedSections,
  ownershipPublic,
}: SummaryInput): SummaryRow[] => {
  const confirmed = new Set(confirmedSections ?? []);
  const bucket = (key: string): Record<string, unknown> =>
    confirmed.has(key) ? (values[key] ?? {}) : {};

  const utilities = bucket('utilities');
  const safety = bucket('safety');
  const condition = bucket('condition_details');
  const vehicle = bucket('vehicle');
  const trailer = bucket('trailer');
  const dimensions = bucket('dimensions');
  const inventory = readInventory(confirmed.has('equipment_inventory') ? values.equipment_inventory : {});
  const viewing = bucket('viewing');

  const rows: SummaryRow[] = [];
  const push = (label: string, value: string | null, applicable = true) => {
    if (!applicable) return;
    rows.push(value ? { label, value } : { label, value: UNKNOWN_LABEL, unknown: true });
  };

  push('Operational status', str(condition.operational_status));

  if (mode === 'sale' && ownershipPublic && Object.keys(ownershipPublic).length > 0) {
    push('Title status', str(ownershipPublic.title_summary));
  }

  if (MOBILE.includes(category ?? '')) {
    const year = str(vehicle.year) ?? str(trailer.year);
    push(category === 'food_truck' ? 'Vehicle year' : 'Trailer year', year);
  }
  if (KITCHEN.includes(category ?? '')) {
    push('Kitchen build year', str(dimensions.kitchen_build_year));
  }

  const power = [
    str(utilities.shore_power) ? `${str(utilities.shore_power)} shore power` : null,
    utilities.generator_present === true
      ? `generator${str(utilities.generator_model) ? ` (${str(utilities.generator_model)})` : ''}`
      : null,
    str(utilities.solar_battery) ? `solar/battery: ${str(utilities.solar_battery)}` : null,
  ].filter(Boolean);
  push('Power configuration', power.length ? power.join(', ') : null);

  const water = [
    str(utilities.fresh_water_gal) ? `${str(utilities.fresh_water_gal)} gal fresh` : null,
    str(utilities.grey_water_gal) ? `${str(utilities.grey_water_gal)} gal grey` : null,
  ].filter(Boolean);
  push('Water capacity', water.length ? water.join(' · ') : null, KITCHEN.includes(category ?? ''));

  const hood = [
    str(safety.hood_type) && safety.hood_type !== 'None' ? `${str(safety.hood_type)} hood` : null,
    str(safety.suppression_system) ? `suppression: ${str(safety.suppression_system)}` : null,
  ].filter(Boolean);
  push('Hood and fire suppression', hood.length ? hood.join(', ') : null, KITCHEN.includes(category ?? ''));

  push(
    'Last reported inspection or service',
    str(condition.last_service_date) ?? str(safety.suppression_last_service),
  );
  push('Known repairs needed', str(condition.repairs_needed) ?? str(condition.known_issue_notes));

  if (inventory.length) {
    rows.push({ label: 'Confirmed equipment items', value: `${inventory.length} listed by the seller` });
  }

  const handoff = [
    viewing.in_person === true ? 'in-person viewing' : null,
    viewing.test_drive === true ? 'test drive' : null,
    viewing.equipment_testing === true ? 'equipment testing' : null,
  ].filter(Boolean);
  if (handoff.length) rows.push({ label: 'Viewing and testing', value: handoff.join(', ') });

  if (ownershipPublic?.documents_available === true) {
    rows.push({ label: 'Documents available', value: 'The seller reports documentation is available on request' });
  }

  return rows;
};

export const SUMMARY_DISCLAIMER = READINESS_DISCLAIMER;

/**
 * Public, summarized ownership facts. Identifiers, owner names, lienholders
 * and documents never leave the private table.
 */
export const buildOwnershipPublicSummary = (privateValues: {
  title_status?: string | null;
  active_lien?: boolean | null;
  lien_release_available?: boolean | null;
  documents_available?: boolean | null;
  authority_to_sell?: boolean | null;
}): Record<string, unknown> => {
  const summary: Record<string, unknown> = {};
  if (privateValues.title_status === 'Clean title in hand') summary.title_summary = 'Clean title';
  else if (privateValues.active_lien) summary.title_summary = 'Lien disclosed';
  else if (privateValues.title_status) summary.title_summary = privateValues.title_status;
  else summary.title_summary = 'Ownership not yet verified';

  if (privateValues.lien_release_available) summary.lien_release_available = true;
  if (privateValues.documents_available) summary.documents_available = true;
  if (privateValues.authority_to_sell) summary.authority_to_sell_confirmed = true;
  return summary;
};
