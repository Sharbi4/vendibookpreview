/**
 * Post-publish listing depth: structured spec sections, scoring and readiness
 * labels. None of this is required to publish — it only deepens a listing that
 * is already live.
 *
 * Scoring is deterministic and versioned. Only sections relevant to a
 * listing's category and mode are ever counted, so a missing field that does
 * not apply can never lower a score.
 */

import { readInventory } from './equipment';

export type SpecFieldType = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'textarea';

export interface SpecField {
  key: string;
  label: string;
  type: SpecFieldType;
  help?: string;
  unit?: string;
  options?: string[];
  placeholder?: string;
}

export interface SpecSection {
  key: string;
  title: string;
  blurb: string;
  /** Listing categories this section applies to. Empty = all. */
  categories?: string[];
  /** 'rent' | 'sale' | undefined (both) */
  mode?: 'rent' | 'sale';
  weight: number;
  fields: SpecField[];
  /** Rendered by a dedicated component instead of the generic field grid. */
  custom?: 'equipment' | 'ownership';
}

const MOBILE = ['food_truck', 'food_trailer'];
const KITCHEN = ['food_truck', 'food_trailer', 'ghost_kitchen'];
const SITE = ['vendor_lot', 'vendor_space', 'ghost_kitchen'];
const TRUCK = ['food_truck'];
const TRAILER = ['food_trailer'];

const NOT_SURE = 'Not sure';

export const SPEC_SECTIONS: SpecSection[] = [
  {
    key: 'equipment_inventory',
    title: 'Installed equipment',
    blurb: 'The equipment list is the first thing a buyer compares against their menu.',
    categories: KITCHEN,
    weight: 16,
    custom: 'equipment',
    fields: [],
  },
  {
    key: 'utilities',
    title: 'Utilities: power, propane and water',
    blurb: 'Power and water decide where a unit can legally operate.',
    weight: 14,
    fields: [
      { key: 'generator_present', label: 'Generator on board', type: 'boolean' },
      { key: 'generator_fuel', label: 'Generator fuel', type: 'select', options: ['Gasoline', 'Diesel', 'Propane', 'Dual fuel', NOT_SURE] },
      { key: 'generator_model', label: 'Generator make / model', type: 'text', placeholder: 'e.g. Onan 7000' },
      { key: 'generator_running_watts', label: 'Running wattage', type: 'number', unit: 'W', help: 'Continuous output. Leave blank if you are not sure.' },
      { key: 'generator_surge_watts', label: 'Surge wattage', type: 'number', unit: 'W', help: 'Peak output for start-up loads.' },
      { key: 'generator_hours', label: 'Generator hours', type: 'text', placeholder: 'e.g. 1,200 or Not sure' },
      { key: 'generator_included', label: 'Generator included', type: 'boolean' },
      { key: 'generator_condition', label: 'Generator condition', type: 'select', options: ['Working', 'Working with known issues', 'Not working', NOT_SURE] },
      { key: 'shore_power', label: 'Shore power', type: 'select', options: ['None', '30 amp', '50 amp', '100 amp', 'Other', NOT_SURE], help: 'The plug you connect to at an event or commissary.' },
      { key: 'shore_power_voltage', label: 'Shore power voltage', type: 'select', options: ['120V', '120/240V', '208V', 'Other', NOT_SURE] },
      { key: 'shore_power_connector', label: 'Connector type', type: 'text', placeholder: 'e.g. NEMA 14-50', help: 'The physical plug shape on your cord.' },
      { key: 'solar_battery', label: 'Solar or battery system', type: 'text', placeholder: 'e.g. 400W solar, 200Ah battery' },
      { key: 'propane_tank_count', label: 'Propane tanks', type: 'number' },
      { key: 'propane_tank_size', label: 'Tank capacity', type: 'text', placeholder: 'e.g. two 40 lb' },
      { key: 'propane_mounting', label: 'Tank mounting', type: 'select', options: ['Mounted', 'Removable', 'Both', NOT_SURE] },
      { key: 'propane_cert_date', label: 'Tank certification date', type: 'text', help: 'Only if you know it. Leave blank otherwise.' },
      { key: 'fresh_water_gal', label: 'Fresh water capacity', type: 'number', unit: 'gal' },
      { key: 'grey_water_gal', label: 'Grey water capacity', type: 'number', unit: 'gal' },
      { key: 'water_pump', label: 'Water pump', type: 'text' },
      { key: 'water_heater', label: 'Water heater', type: 'text' },
      { key: 'city_water_inlet', label: 'City water inlet', type: 'boolean', help: 'A hookup that lets you run from a hose instead of the tank.' },
      { key: 'wastewater_connection', label: 'Wastewater connection', type: 'text' },
      { key: 'sink_configuration', label: 'Sink configuration', type: 'text', placeholder: 'e.g. 3-compartment plus hand sink' },
    ],
  },
  {
    key: 'safety',
    title: 'Hood, fire suppression and safety',
    blurb: 'Health and fire inspectors ask about this first, so buyers ask too.',
    categories: KITCHEN,
    weight: 12,
    fields: [
      { key: 'hood_type', label: 'Hood type', type: 'select', options: ['None', 'Type I', 'Type II', NOT_SURE], help: 'Type I handles grease; Type II handles heat and steam.' },
      { key: 'hood_length_ft', label: 'Hood length', type: 'number', unit: 'ft' },
      { key: 'exhaust', label: 'Exhaust setup', type: 'text', placeholder: 'e.g. 1,200 CFM exhaust with make-up air' },
      { key: 'suppression_system', label: 'Fire suppression system', type: 'text', placeholder: 'e.g. Ansul R-102' },
      { key: 'suppression_last_service', label: 'Last suppression service or tag date', type: 'text' },
      { key: 'extinguishers', label: 'Fire extinguishers on board', type: 'number' },
      { key: 'safety_docs_available', label: 'Service or inspection documents available', type: 'boolean', help: 'Documents you can share privately with a serious buyer. This is not a permit transfer or an approval.' },
    ],
  },
  {
    key: 'vehicle',
    title: 'Truck details',
    blurb: 'Drivetrain and service history buyers always ask about.',
    categories: TRUCK,
    weight: 12,
    fields: [
      { key: 'make', label: 'Make', type: 'text' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'trim', label: 'Trim', type: 'text' },
      { key: 'year', label: 'Vehicle year', type: 'number' },
      { key: 'mileage', label: 'Mileage', type: 'number', unit: 'mi' },
      { key: 'engine', label: 'Engine', type: 'text' },
      { key: 'fuel_type', label: 'Fuel type', type: 'select', options: ['Gasoline', 'Diesel', 'Propane', 'Hybrid', 'Electric', NOT_SURE] },
      { key: 'transmission', label: 'Transmission', type: 'select', options: ['Automatic', 'Manual', NOT_SURE] },
      { key: 'drivetrain', label: 'Drivetrain', type: 'select', options: ['RWD', 'FWD', 'AWD', '4WD', NOT_SURE] },
      { key: 'gvwr_lbs', label: 'GVWR', type: 'number', unit: 'lb', help: 'Gross vehicle weight rating from the door jamb plate.' },
      { key: 'cab_ac', label: 'Cab air conditioning', type: 'boolean' },
      { key: 'kitchen_ac', label: 'Kitchen air conditioning', type: 'boolean' },
      { key: 'tires_brakes', label: 'Tires and brakes', type: 'text', placeholder: 'e.g. tires replaced 2024, brakes at 60%' },
      { key: 'recent_service', label: 'Recent service', type: 'textarea' },
      { key: 'rebuilds', label: 'Engine or transmission rebuild', type: 'text' },
      { key: 'warning_lights', label: 'Active warning lights', type: 'text', placeholder: 'e.g. none, or check engine' },
      { key: 'starts_runs_drives', label: 'Starts, runs and drives', type: 'select', options: ['Yes', 'Starts and runs, does not drive', 'Does not start', NOT_SURE] },
      { key: 'test_drive_allowed', label: 'Test drive allowed', type: 'boolean' },
    ],
  },
  {
    key: 'trailer',
    title: 'Trailer details',
    blurb: 'Towing specifics that decide whether a buyer can move it home.',
    categories: TRAILER,
    weight: 12,
    fields: [
      { key: 'length_ft', label: 'Overall length', type: 'number', unit: 'ft' },
      { key: 'width_ft', label: 'Width', type: 'number', unit: 'ft' },
      { key: 'interior_height_ft', label: 'Interior height', type: 'number', unit: 'ft' },
      { key: 'dry_weight_lbs', label: 'Dry weight', type: 'number', unit: 'lb' },
      { key: 'gvwr_lbs', label: 'GVWR', type: 'number', unit: 'lb', help: 'Maximum loaded weight from the tongue plate.' },
      { key: 'axles', label: 'Axles', type: 'number' },
      { key: 'axle_rating_lbs', label: 'Axle rating', type: 'number', unit: 'lb' },
      { key: 'braked_axles', label: 'Braked axles', type: 'select', options: ['None', 'One', 'Both', NOT_SURE] },
      { key: 'hitch_type', label: 'Hitch type', type: 'select', options: ['Bumper pull', 'Gooseneck', 'Fifth wheel', NOT_SURE] },
      { key: 'ball_size', label: 'Ball size', type: 'select', options: ['1 7/8"', '2"', '2 5/16"', NOT_SURE] },
      { key: 'connector', label: 'Wiring connector', type: 'select', options: ['4-pin', '7-pin', 'Other', NOT_SURE] },
      { key: 'jacks', label: 'Jacks', type: 'text' },
      { key: 'tire_age_condition', label: 'Tire age and condition', type: 'text' },
      { key: 'serving_side', label: 'Serving side', type: 'select', options: ['Curb side', 'Street side', 'Both', 'Rear', NOT_SURE] },
      { key: 'window_dimensions', label: 'Serving window size', type: 'text' },
      { key: 'towable', label: 'Towable as-is', type: 'boolean' },
      { key: 'recommended_tow_capacity', label: 'Recommended tow capacity', type: 'text', placeholder: 'e.g. 3/4 ton truck or larger' },
    ],
  },
  {
    key: 'space',
    title: 'Space and access',
    blurb: 'What a vendor gets when they arrive on site.',
    categories: SITE,
    weight: 14,
    fields: [
      { key: 'access', label: 'Access', type: 'textarea', placeholder: 'Gate codes are shared privately after booking.' },
      { key: 'operating_hours', label: 'Operating hours', type: 'text' },
      { key: 'parking', label: 'Parking', type: 'text' },
      { key: 'utilities_available', label: 'Utilities available', type: 'text', placeholder: 'e.g. 50 amp power, potable water' },
      { key: 'permitted_use', label: 'Permitted use', type: 'text', help: 'What the space is approved for by the property, not a permit transfer.' },
      { key: 'shared_or_private', label: 'Shared or private', type: 'select', options: ['Private', 'Shared', 'Mixed', NOT_SURE] },
      { key: 'loading', label: 'Loading and unloading', type: 'text' },
      { key: 'storage', label: 'Storage available', type: 'text' },
      { key: 'restroom', label: 'Restroom access', type: 'boolean' },
      { key: 'inspections_docs', label: 'Inspection or compliance documents available', type: 'boolean' },
    ],
  },
  {
    key: 'dimensions',
    title: 'Size and weight',
    blurb: 'Helps buyers plan towing, parking and permitting.',
    categories: MOBILE,
    weight: 8,
    fields: [
      { key: 'box_length_ft', label: 'Box / usable length', type: 'number', unit: 'ft' },
      { key: 'overall_length_ft', label: 'Overall length', type: 'number', unit: 'ft' },
      { key: 'width_ft', label: 'Width', type: 'number', unit: 'ft' },
      { key: 'height_ft', label: 'Height', type: 'number', unit: 'ft' },
      { key: 'kitchen_build_year', label: 'Kitchen build year', type: 'number' },
    ],
  },
  {
    key: 'condition_details',
    title: 'Condition and maintenance',
    blurb: 'Recent service and honest issues give serious buyers confidence.',
    weight: 12,
    fields: [
      { key: 'operational_status', label: 'Operational status', type: 'select', options: ['Fully operational', 'Operational with known issues', 'Needs repair before use', 'Project / not operational', NOT_SURE] },
      { key: 'known_issue_categories', label: 'Known issue areas', type: 'text', placeholder: 'e.g. generator, refrigeration, plumbing' },
      { key: 'known_issue_notes', label: 'Explain known issues', type: 'textarea' },
      { key: 'repairs_upgrades', label: 'Recent repairs or upgrades', type: 'textarea' },
      { key: 'last_service_date', label: 'Last service or inspection date', type: 'text' },
      { key: 'records_manuals_keys', label: 'Records, manuals and keys', type: 'text' },
      { key: 'accident_damage', label: 'Accident or major damage history', type: 'text' },
      { key: 'storage_winterization', label: 'Storage and winterization', type: 'text' },
      { key: 'repairs_needed', label: 'Repairs a buyer should expect', type: 'textarea' },
    ],
  },
  {
    key: 'ownership',
    title: 'Ownership and documents',
    blurb: 'Kept private. Only a short summary is shown publicly.',
    mode: 'sale',
    weight: 10,
    custom: 'ownership',
    fields: [],
  },
  {
    key: 'inclusions',
    title: 'What is included',
    blurb: 'Set expectations so nothing is a surprise at handoff.',
    weight: 10,
    fields: [
      { key: 'all_pictured', label: 'Everything shown in the photos is included', type: 'boolean' },
      { key: 'photos_exclusions', label: 'Is anything shown in the photos not included?', type: 'textarea', help: 'List anything visible in your photos that stays with you.' },
      { key: 'smallwares', label: 'Smallwares and pans', type: 'boolean' },
      { key: 'pos_system', label: 'POS system', type: 'boolean' },
      { key: 'wrap_branding', label: 'Wrap or branding', type: 'boolean' },
      { key: 'menu_boards', label: 'Menu boards', type: 'boolean' },
      { key: 'generator', label: 'Generator', type: 'boolean' },
      { key: 'propane_tanks', label: 'Propane tanks', type: 'boolean' },
      { key: 'spare_parts', label: 'Spare parts', type: 'boolean' },
      { key: 'manuals_records', label: 'Manuals and records', type: 'boolean' },
      { key: 'business_assets', label: 'Business assets (name, socials, recipes, accounts)', type: 'boolean', help: 'Business assets transfer through a separate written agreement. They are not part of the equipment sale.' },
      { key: 'business_assets_notes', label: 'Business asset notes', type: 'textarea' },
    ],
  },
  {
    key: 'viewing',
    title: 'Viewing and testing',
    blurb: 'Buyers move faster when they know how they can see and test it.',
    weight: 8,
    fields: [
      { key: 'in_person', label: 'In-person viewing', type: 'boolean' },
      { key: 'video_tour', label: 'Recorded video tour available', type: 'boolean' },
      { key: 'live_video', label: 'Live video walkthrough', type: 'boolean' },
      { key: 'test_drive', label: 'Test drive', type: 'boolean' },
      { key: 'mechanic_inspection', label: 'Mechanic or inspector welcome', type: 'boolean' },
      { key: 'equipment_testing', label: 'Equipment can be powered up and tested', type: 'boolean' },
      { key: 'appointment_required', label: 'Appointment required', type: 'boolean' },
      { key: 'earliest_date', label: 'Earliest viewing date', type: 'text' },
      { key: 'viewing_notes', label: 'Anything a visitor should know', type: 'textarea', help: 'Keep contact details and the exact address inside VendiBook messaging.' },
    ],
  },
];

export const sectionsForListing = (category?: string | null, mode?: string | null): SpecSection[] =>
  SPEC_SECTIONS.filter(
    (s) =>
      (!s.categories || (category ? s.categories.includes(category) : true)) &&
      (!s.mode || s.mode === mode),
  );

export type SpecValues = Record<string, Record<string, unknown>>;

const filled = (v: unknown) =>
  v !== undefined && v !== null && v !== '' && !(typeof v === 'boolean' && v === false);

export const sectionFilledCount = (section: SpecSection, values: SpecValues): number => {
  const bucket = values[section.key] ?? {};
  if (section.custom === 'equipment') {
    return Math.min(readInventory(bucket).length, 6);
  }
  if (section.custom === 'ownership') {
    return Object.values(bucket).filter(filled).length;
  }
  return section.fields.filter((f) => filled(bucket[f.key])).length;
};

/** Denominator used for a section's completion ratio. */
export const sectionTargetCount = (section: SpecSection): number => {
  if (section.custom === 'equipment') return 6;
  if (section.custom === 'ownership') return 4;
  return section.fields.length;
};

export type ReadinessLevel = 'published' | 'buyer_ready' | 'highly_detailed';

export interface ReadinessResult {
  score: number;
  level: ReadinessLevel;
  missingSections: string[];
  version: number;
}

/**
 * Deterministic scoring definition version. Bump whenever section weights,
 * fields or thresholds change so stored scores can be recomputed instead of
 * silently compared across definitions.
 *
 * v2 — Phase 4 deep sections (equipment inventory, utilities, safety,
 * vehicle/trailer/space branches, condition, ownership summary).
 */
export const READINESS_SCORE_VERSION = 2;

/** Score thresholds, part of the versioned definition. */
export const READINESS_THRESHOLDS = { buyer_ready: 40, highly_detailed: 80 } as const;

export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  published: 'Published',
  buyer_ready: 'Buyer ready',
  highly_detailed: 'Highly detailed',
};

export const READINESS_LEVEL_BLURBS: Record<ReadinessLevel, string> = {
  published: 'Live with the essential information buyers need to reach you.',
  buyer_ready: 'Live with the major details most buyers ask about.',
  highly_detailed: 'Live with comprehensive details for this type of listing.',
};

/** Required, reusable seller-information disclaimer. */
export const READINESS_DISCLAIMER =
  'Information provided by the seller. Buyers must independently verify condition, ownership, title, permits, inspections, and local requirements.';

export const computeReadiness = (
  sections: SpecSection[],
  values: SpecValues,
): ReadinessResult => {
  // Only sections relevant to this listing's category and mode are passed in,
  // so non-applicable fields can never lower the score.
  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0) || 1;
  let earned = 0;
  const missing: string[] = [];

  for (const section of sections) {
    const target = sectionTargetCount(section);
    const count = sectionFilledCount(section, values);
    const ratio = target ? Math.min(count / target, 1) : 0;
    earned += ratio * section.weight;
    if (ratio < 0.5) missing.push(section.key);
  }

  const score = Math.round((earned / totalWeight) * 100);
  const level: ReadinessLevel =
    score >= READINESS_THRESHOLDS.highly_detailed
      ? 'highly_detailed'
      : score >= READINESS_THRESHOLDS.buyer_ready
        ? 'buyer_ready'
        : 'published';

  return { score, level, missingSections: missing, version: READINESS_SCORE_VERSION };
};

/**
 * Highest-value next actions for a live listing. Each one explains the buyer
 * benefit and deep-links into a single section that saves independently.
 */
export interface NextAction {
  /** Spec section key, or 'rental_terms' for the rental terms editor. */
  section: string;
  title: string;
  why: string;
}

const NEXT_ACTION_LIBRARY: NextAction[] = [
  {
    section: 'utilities',
    title: 'Add power and water information',
    why: 'Power and water capacity decide which events and health departments will accept it.',
  },
  {
    section: 'equipment_inventory',
    title: 'Describe installed equipment',
    why: 'The equipment list is the first thing a buyer compares against their menu.',
  },
  {
    section: 'safety',
    title: 'Add hood and fire suppression',
    why: 'Health and fire inspectors ask about this first, so buyers ask too.',
  },
  {
    section: 'vehicle',
    title: 'Add truck details',
    why: 'Drivetrain, mileage and service history tell a buyer what they are really buying.',
  },
  {
    section: 'trailer',
    title: 'Add trailer and towing details',
    why: 'Buyers need to know whether their vehicle can tow it home.',
  },
  {
    section: 'space',
    title: 'Describe the space and access',
    why: 'Vendors need to picture the arrival, hookups and hours before they book.',
  },
  {
    section: 'condition_details',
    title: 'Add inspection and maintenance',
    why: 'Recent service and honest issue notes give serious buyers confidence.',
  },
  {
    section: 'inclusions',
    title: 'Confirm what is included',
    why: 'Setting expectations early prevents surprises and back-and-forth at handoff.',
  },
  {
    section: 'viewing',
    title: 'Add viewing and testing',
    why: 'Buyers move faster when they know how they can see and test it in person.',
  },
  {
    section: 'rental_terms',
    title: 'Complete rental terms',
    why: 'Clear terms let renters book without messaging you for the basics.',
  },
];

/** Returns the ordered next actions that still apply to this listing. */
export const nextActionsForListing = (
  category: string | null | undefined,
  mode: string | null | undefined,
  values: SpecValues,
  rentalTermsConfirmed = false,
): NextAction[] => {
  const applicable = new Set(sectionsForListing(category, mode).map((s) => s.key));
  return NEXT_ACTION_LIBRARY.filter((action) => {
    if (action.section === 'rental_terms') {
      return mode === 'rent' && !rentalTermsConfirmed;
    }
    if (!applicable.has(action.section)) return false;
    const section = SPEC_SECTIONS.find((s) => s.key === action.section);
    if (!section) return false;
    return sectionFilledCount(section, values) < Math.ceil(sectionTargetCount(section) / 2);
  });
};
