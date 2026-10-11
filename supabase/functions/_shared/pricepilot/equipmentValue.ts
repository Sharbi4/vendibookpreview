/**
 * PricePilot equipment / buildout value layer (SALE valuations only).
 *
 * Marketplace comps alone under-explain why a turnkey coffee trailer with a
 * commercial espresso system is worth more than a bare shell of the same size.
 * This module:
 *   1. Parses the seller's supplied feature toggles + free text into structured
 *      equipment groups (explicit facts only — nothing is assumed present).
 *   2. Attaches conservative REPLACEMENT (new) cost bands per component. These
 *      are industry bands used as context, never realized resale value.
 *   3. Applies age / condition / operating-status depreciation to produce a
 *      USED CONTRIBUTION range, clearly labelled as different from replacement
 *      cost and from resale value.
 *   4. Produces a small, hard-capped price bias so expensive installed systems
 *      influence the recommendation WITHOUT being added on top of comps
 *      (comparable listings already embed typical equipment).
 *
 * Rentals never consume the dollar figures here.
 */

export type EquipmentTier = 'major' | 'supporting' | 'accessory';
export type EquipmentStatus = 'present' | 'missing' | 'nonfunctional';

export interface EquipmentCatalogEntry {
  key: string;
  name: string;
  group: string;
  tier: EquipmentTier;
  newLow: number;
  newHigh: number;
  /** Feature toggle keys that directly imply this component. */
  featureKeys?: string[];
  /** Lower-cased keywords matched against supplied free text. */
  keywords: string[];
}

/**
 * Conservative U.S. replacement-cost bands for commonly installed mobile-kitchen
 * components. Ranges are intentionally wide: they are replacement-cost context,
 * refined by live web research when available, never a quoted price.
 */
export const EQUIPMENT_CATALOG: EquipmentCatalogEntry[] = [
  { key: 'hood', name: 'Commercial hood & ventilation', group: 'hood_ventilation', tier: 'major', newLow: 3500, newHigh: 9000, featureKeys: ['hood_fire_suppression'], keywords: ['hood', 'exhaust hood', 'ventilation', 'vent hood', 'makeup air'] },
  { key: 'fire_suppression', name: 'Fire suppression system', group: 'fire_safety', tier: 'major', newLow: 2500, newHigh: 6000, featureKeys: ['hood_fire_suppression'], keywords: ['fire suppression', 'ansul', 'suppression system'] },
  { key: 'generator', name: 'Onboard generator', group: 'power', tier: 'major', newLow: 3000, newHigh: 12000, featureKeys: ['generator'], keywords: ['generator', 'genset', 'onan', 'kubota generator', 'honda eu'] },
  { key: 'shore_power', name: 'Shore power / electrical system', group: 'power', tier: 'major', newLow: 1500, newHigh: 6000, keywords: ['shore power', 'electrical panel', 'breaker panel', '50 amp', '30 amp', 'rewired'] },
  { key: 'solar_battery', name: 'Solar / battery system', group: 'power', tier: 'supporting', newLow: 2500, newHigh: 10000, keywords: ['solar', 'battery bank', 'lithium battery', 'inverter'] },
  { key: 'refrigeration', name: 'Refrigeration package', group: 'refrigeration', tier: 'major', newLow: 2500, newHigh: 9000, featureKeys: ['refrigeration'], keywords: ['refrigerat', 'reach-in', 'reach in cooler', 'cooler', 'fridge', 'undercounter cooler'] },
  { key: 'freezer', name: 'Freezer', group: 'refrigeration', tier: 'supporting', newLow: 1500, newHigh: 5000, keywords: ['freezer'] },
  { key: 'plumbing', name: 'Sinks, water tanks & water heater', group: 'plumbing', tier: 'major', newLow: 2000, newHigh: 6000, featureKeys: ['plumbing'], keywords: ['3 compartment', 'three compartment', 'sink', 'hand wash', 'fresh water', 'grey water', 'gray water', 'water heater', 'water tank', 'plumbing'] },
  { key: 'fryer', name: 'Commercial fryer', group: 'cooking_line', tier: 'supporting', newLow: 1200, newHigh: 4000, keywords: ['fryer', 'deep fry'] },
  { key: 'griddle', name: 'Flat top / griddle', group: 'cooking_line', tier: 'supporting', newLow: 700, newHigh: 2500, keywords: ['flat top', 'flattop', 'griddle'] },
  { key: 'range', name: 'Range / burners', group: 'cooking_line', tier: 'supporting', newLow: 900, newHigh: 3500, keywords: ['range', 'burner', 'stove'] },
  { key: 'oven', name: 'Commercial oven', group: 'cooking_line', tier: 'supporting', newLow: 1500, newHigh: 5000, keywords: ['convection oven', ' oven'] },
  { key: 'pizza_oven', name: 'Pizza oven', group: 'specialty_cooking', tier: 'major', newLow: 4000, newHigh: 15000, keywords: ['pizza oven', 'deck oven', 'wood fired', 'wood-fired'] },
  { key: 'smoker', name: 'Smoker / custom BBQ fabrication', group: 'specialty_cooking', tier: 'major', newLow: 3000, newHigh: 20000, keywords: ['smoker', 'offset smoker', 'bbq pit', 'barbecue pit', 'pellet smoker'] },
  { key: 'charbroiler', name: 'Charbroiler / grill', group: 'cooking_line', tier: 'supporting', newLow: 900, newHigh: 3000, keywords: ['charbroiler', 'char broiler', 'grill'] },
  { key: 'espresso_machine', name: 'Commercial espresso machine', group: 'coffee', tier: 'major', newLow: 6000, newHigh: 25000, keywords: ['espresso machine', 'espresso', 'la marzocco', 'nuova simonelli', 'slayer'] },
  { key: 'espresso_grinder', name: 'Commercial coffee grinder', group: 'coffee', tier: 'supporting', newLow: 800, newHigh: 4000, keywords: ['grinder', 'mahlkonig', 'mazzer'] },
  { key: 'ice', name: 'Ice machine / ice storage', group: 'ice', tier: 'supporting', newLow: 1500, newHigh: 6000, keywords: ['ice machine', 'ice maker', 'ice bin'] },
  { key: 'hvac', name: 'AC / heat', group: 'climate', tier: 'supporting', newLow: 1200, newHigh: 4500, keywords: ['air condition', ' a/c', 'mini split', 'hvac', 'heater'] },
  { key: 'pos', name: 'POS / payment hardware', group: 'service', tier: 'accessory', newLow: 500, newHigh: 3000, keywords: ['pos ', 'point of sale', 'square terminal', 'clover'] },
  { key: 'service_window', name: 'Service windows / awning', group: 'service', tier: 'accessory', newLow: 800, newHigh: 4000, keywords: ['service window', 'serving window', 'awning', 'concession window'] },
  { key: 'prep_storage', name: 'Prep tables & storage', group: 'prep', tier: 'accessory', newLow: 500, newHigh: 3000, keywords: ['prep table', 'stainless shelving', 'storage cabinet', 'work table'] },
  { key: 'fabrication', name: 'Custom fabrication / wrap', group: 'fabrication', tier: 'supporting', newLow: 2000, newHigh: 12000, keywords: ['custom build', 'custom fabricat', 'full wrap', 'vinyl wrap'] },
];

export interface EquipmentSubjectInput {
  assetCategory: 'food_truck' | 'food_trailer' | 'food_cart' | 'mobile_bar';
  year?: number | null;
  mileage?: number | null;
  condition?: 'excellent' | 'good' | 'fair' | 'project' | null;
  operationalStatus?: 'turnkey' | 'running' | 'needs_work' | 'not_running' | null;
  features: Record<string, boolean>;
  knownIssues?: string | null;
  recentUpgrades?: string | null;
  notes?: string | null;
}

export interface DetectedComponent {
  key: string;
  name: string;
  group: string;
  tier: EquipmentTier;
  status: EquipmentStatus;
  newLow: number;
  newHigh: number;
  /** How we learned about it — never inferred from an empty input. */
  evidence: 'feature toggle' | 'seller description';
  condition: string;
}

export interface EquipmentValueComponent {
  name: string;
  estimatedNewRange: string;
  condition: string;
  valuationImpact: string;
}

export interface EquipmentValueSection {
  estimatedReplacementRangeLow: number | null;
  estimatedReplacementRangeHigh: number | null;
  estimatedUsedContributionLow: number | null;
  estimatedUsedContributionHigh: number | null;
  buildoutTier: 'unknown' | 'bare_shell' | 'partially_equipped' | 'equipped' | 'turnkey_premium';
  majorComponents: EquipmentValueComponent[];
  notes: string[];
  sources: { title: string; url: string }[];
}

export interface EquipmentAssessment {
  section: EquipmentValueSection;
  components: DetectedComponent[];
  deficiencies: string[];
  /** Hard-capped multiplier applied to the recommended sale price. */
  priceBias: number;
  biasExplanation: string | null;
  /** Search phrases for the live web research layer. */
  researchQueries: string[];
}

const MISSING_PATTERNS = [
  /\bno\s+([a-z /]{3,30})/g,
  /\bwithout\s+([a-z /]{3,30})/g,
  /\bmissing\s+([a-z /]{3,30})/g,
  /\bneeds?\s+(?:a\s+)?([a-z /]{3,30})/g,
  /\b([a-z /]{3,30})\s+(?:does not work|doesn't work|not working|is broken|needs repair)/g,
];

const BARE_SHELL = /\b(bare shell|empty shell|shell only|no equipment|unequipped|blank slate)\b/;

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Typical used-equipment contribution already embedded in a comparable. */
const BASELINE_EMBEDDED_CONTRIBUTION: Record<string, number> = {
  food_truck: 18000,
  food_trailer: 12000,
  food_cart: 4000,
  mobile_bar: 8000,
};

function freeText(subject: EquipmentSubjectInput): string {
  return [subject.notes, subject.recentUpgrades, subject.knownIssues]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase();
}

/** Depreciation band for used contribution. Never assumes new condition. */
export function usedContributionFactors(subject: EquipmentSubjectInput): { low: number; high: number; ageKnown: boolean } {
  const year = subject.year ?? null;
  const age = year ? Math.max(0, new Date().getFullYear() - year) : null;
  let low = 0.22;
  let high = 0.38;
  if (age !== null) {
    if (age <= 2) { low = 0.5; high = 0.68; }
    else if (age <= 5) { low = 0.38; high = 0.55; }
    else if (age <= 10) { low = 0.26; high = 0.42; }
    else { low = 0.16; high = 0.3; }
  }
  const condMult = subject.condition === 'excellent' ? 1.1
    : subject.condition === 'good' ? 1.0
    : subject.condition === 'fair' ? 0.82
    : subject.condition === 'project' ? 0.6
    : 0.9; // unknown condition is treated conservatively, never as new
  const opMult = subject.operationalStatus === 'turnkey' ? 1.08
    : subject.operationalStatus === 'running' ? 1.0
    : subject.operationalStatus === 'needs_work' ? 0.85
    : subject.operationalStatus === 'not_running' ? 0.7
    : 0.95;
  const clamp = (n: number) => Math.min(0.8, Math.max(0.08, n));
  return { low: clamp(low * condMult * opMult), high: clamp(high * condMult * opMult), ageKnown: age !== null };
}

/** Explicit-fact parsing: toggles + seller text only. Nothing is assumed. */
export function parseEquipment(subject: EquipmentSubjectInput): { components: DetectedComponent[]; deficiencies: string[] } {
  const text = freeText(subject);
  const conditionLabel = subject.condition
    ? `user supplied (unit condition: ${subject.condition})`
    : 'unknown';

  const negatives = new Set<string>();
  for (const re of MISSING_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) negatives.add(m[1].trim());
  }
  const negativeBlob = [...negatives].join(' | ');

  const components: DetectedComponent[] = [];
  const deficiencies: string[] = [];

  for (const entry of EQUIPMENT_CATALOG) {
    const byToggle = (entry.featureKeys ?? []).some((k) => subject.features[k] === true);
    const matchedKeyword = entry.keywords.find((k) => text.includes(k));
    const negated = entry.keywords.some((k) => negativeBlob.includes(k.trim()));

    if (negated) {
      deficiencies.push(entry.name);
      components.push({
        key: entry.key,
        name: entry.name,
        group: entry.group,
        tier: entry.tier,
        status: /broken|not working|does not work|doesn't work|needs repair/.test(text) && matchedKeyword ? 'nonfunctional' : 'missing',
        newLow: entry.newLow,
        newHigh: entry.newHigh,
        evidence: 'seller description',
        condition: conditionLabel,
      });
      continue;
    }
    if (!byToggle && !matchedKeyword) continue;

    components.push({
      key: entry.key,
      name: entry.name,
      group: entry.group,
      tier: entry.tier,
      status: 'present',
      newLow: entry.newLow,
      newHigh: entry.newHigh,
      evidence: byToggle ? 'feature toggle' : 'seller description',
      condition: conditionLabel,
    });
  }

  if (BARE_SHELL.test(text)) {
    for (const name of ['Commercial hood & ventilation', 'Fire suppression system', 'Sinks, water tanks & water heater']) {
      if (!components.some((c) => c.name === name && c.status === 'present') && !deficiencies.includes(name)) {
        deficiencies.push(name);
      }
    }
  }

  return { components, deficiencies };
}

const TIER_WEIGHT: Record<EquipmentTier, number> = { major: 1, supporting: 0.7, accessory: 0.35 };

/**
 * Build the full equipment/buildout assessment. `sources` are optional live
 * web-research citations gathered by the caller.
 */
export function assessEquipmentValue(
  subject: EquipmentSubjectInput,
  sources: { title: string; url: string }[] = [],
): EquipmentAssessment {
  const { components, deficiencies } = parseEquipment(subject);
  const present = components.filter((c) => c.status === 'present');
  const factors = usedContributionFactors(subject);
  const notes: string[] = [];

  let replacementLow = 0;
  let replacementHigh = 0;
  let weightedLow = 0;
  let weightedHigh = 0;
  for (const c of present) {
    replacementLow += c.newLow;
    replacementHigh += c.newHigh;
    weightedLow += c.newLow * TIER_WEIGHT[c.tier];
    weightedHigh += c.newHigh * TIER_WEIGHT[c.tier];
  }

  const hasEvidence = present.length > 0;
  const usedLow = hasEvidence ? Math.round(weightedLow * factors.low) : null;
  const usedHigh = hasEvidence ? Math.round(weightedHigh * factors.high) : null;

  const majorPresent = present.filter((c) => c.tier === 'major');
  const infrastructureGroups = new Set(majorPresent.map((c) => c.group));
  const hasCoreInfrastructure =
    infrastructureGroups.has('plumbing') &&
    (infrastructureGroups.has('power') || infrastructureGroups.has('hood_ventilation'));

  let buildoutTier: EquipmentValueSection['buildoutTier'] = 'unknown';
  if (!hasEvidence) buildoutTier = deficiencies.length ? 'bare_shell' : 'unknown';
  else if (deficiencies.length >= 2 && majorPresent.length <= 1) buildoutTier = 'bare_shell';
  else if (majorPresent.length >= 3 && hasCoreInfrastructure && subject.operationalStatus === 'turnkey' && !deficiencies.length) buildoutTier = 'turnkey_premium';
  else if (majorPresent.length >= 2) buildoutTier = 'equipped';
  else buildoutTier = 'partially_equipped';

  // ---- price bias: cross-check against what comps already embed -----------
  const baseline = BASELINE_EMBEDDED_CONTRIBUTION[subject.assetCategory] ?? 12000;
  let bias = 0;
  let biasExplanation: string | null = null;
  if (usedLow !== null && usedHigh !== null) {
    const mid = (usedLow + usedHigh) / 2;
    const delta = (mid - baseline) / baseline;
    bias = Math.max(-0.08, Math.min(0.08, delta * 0.15));
    biasExplanation = bias > 0.005
      ? `Installed systems (${majorPresent.map((c) => c.name).join(', ') || 'buildout package'}) sit above the equipment level a typical comparable already carries, nudging the recommendation up by ${(bias * 100).toFixed(1)}%.`
      : bias < -0.005
        ? `The documented buildout is lighter than a typical comparable of this type, pulling the recommendation down by ${(Math.abs(bias) * 100).toFixed(1)}%.`
        : 'The documented buildout is close to what a typical comparable already carries, so no equipment adjustment was applied.';
  }
  if (deficiencies.length) {
    const penalty = Math.min(0.06, 0.02 * deficiencies.length);
    bias = Math.max(-0.1, bias - penalty);
    biasExplanation = `${biasExplanation ? biasExplanation + ' ' : ''}Missing or nonfunctional infrastructure (${deficiencies.join(', ')}) discounts the position further.`;
  }

  // ---- notes --------------------------------------------------------------
  notes.push('Replacement-cost figures are what comparable equipment costs new today. They are context for the valuation, not resale value and not a dollar-for-dollar addition to the chassis or trailer value.');
  notes.push('Comparable listings already reflect a typical installed equipment package, so equipment research is used as a cross-check and adjustment layer rather than being added on top of the comparable median.');
  if (!hasEvidence) {
    notes.push('No equipment was supplied, so no buildout contribution was estimated. Listing the major installed systems (hood and suppression, power, refrigeration, plumbing, specialty cooking) would materially sharpen this appraisal.');
  } else {
    notes.push(`Used contribution applies a ${Math.round(factors.low * 100)}% to ${Math.round(factors.high * 100)}% depreciation band${factors.ageKnown ? ' based on the supplied build year' : ' (build year not supplied, so a conservative band was used)'}, weighted so major infrastructure counts more than countertop accessories.`);
  }
  if (!subject.condition) notes.push('Equipment condition was not supplied and is treated as unknown, never as new.');
  if (deficiencies.length) notes.push(`Flagged as missing or nonfunctional: ${deficiencies.join(', ')}.`);
  if (subject.assetCategory === 'food_truck') {
    notes.push(
      subject.year || subject.mileage
        ? 'Chassis and drivetrain value (year, mileage, drivability) is assessed separately from the kitchen buildout; the two do not depreciate at the same rate.'
        : 'Chassis details (year, mileage, drivability) were not supplied, so chassis value could not be separated from the kitchen buildout.',
    );
  }
  if (sources.length) notes.push('Replacement-cost context was refined with current web research; see cited sources.');

  const majorComponents: EquipmentValueComponent[] = components
    .filter((c) => c.tier !== 'accessory' || c.status !== 'present')
    .sort((a, b) => (b.newLow + b.newHigh) - (a.newLow + a.newHigh))
    .slice(0, 8)
    .map((c) => ({
      name: c.name,
      estimatedNewRange: `${usd(c.newLow)} – ${usd(c.newHigh)}`,
      condition: c.status === 'present' ? c.condition : c.status === 'missing' ? 'reported missing' : 'reported nonfunctional',
      valuationImpact:
        c.status !== 'present'
          ? 'Reduces value: buyers price in the cost and downtime of adding this system.'
          : c.tier === 'major'
            ? 'Major infrastructure. Supports a premium over a comparable without it, at a depreciated fraction of replacement cost.'
            : 'Supporting equipment. Modest positive influence once depreciated.',
    }));

  const researchQueries = majorPresent.slice(0, 3).map((c) => `commercial ${c.name.toLowerCase()} cost food truck 2026 price range`);

  return {
    section: {
      estimatedReplacementRangeLow: hasEvidence ? Math.round(replacementLow) : null,
      estimatedReplacementRangeHigh: hasEvidence ? Math.round(replacementHigh) : null,
      estimatedUsedContributionLow: usedLow,
      estimatedUsedContributionHigh: usedHigh,
      buildoutTier,
      majorComponents,
      notes,
      sources: sources.slice(0, 5),
    },
    components,
    deficiencies,
    priceBias: Number(bias.toFixed(4)),
    biasExplanation,
    researchQueries,
  };
}
