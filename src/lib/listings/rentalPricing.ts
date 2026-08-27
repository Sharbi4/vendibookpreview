/**
 * Single source of truth for rental / sale price resolution.
 *
 * Historically each surface (card, card overlay, detail pricing panel) had its
 * own inline logic, and several of them only looked at `price_daily`. A listing
 * priced monthly-only therefore rendered "Price TBD" even though it had a valid
 * rate. Everything now funnels through the helpers below.
 */

export type RentalRateUnit = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface RentalRateInput {
  price_hourly?: number | string | null;
  price_daily?: number | string | null;
  price_weekly?: number | string | null;
  price_monthly?: number | string | null;
}

export interface ResolvedRate {
  unit: RentalRateUnit;
  amount: number;
  /** Short suffix used on cards, e.g. `/mo`. */
  suffix: string;
  /** Human label used in pricing tables, e.g. `Monthly rate`. */
  label: string;
}

const UNIT_META: Record<RentalRateUnit, { suffix: string; label: string }> = {
  hourly: { suffix: '/hr', label: 'Hourly rate' },
  daily: { suffix: '/day', label: 'Daily rate' },
  weekly: { suffix: '/week', label: 'Weekly rate' },
  monthly: { suffix: '/mo', label: 'Monthly rate' },
};

/** Display priority: the shortest rate a renter can actually book wins. */
const UNIT_PRIORITY: RentalRateUnit[] = ['daily', 'hourly', 'weekly', 'monthly'];

const FIELD_BY_UNIT: Record<RentalRateUnit, keyof RentalRateInput> = {
  hourly: 'price_hourly',
  daily: 'price_daily',
  weekly: 'price_weekly',
  monthly: 'price_monthly',
};

/** Coerces a possibly-string/null numeric column into a positive number. */
export const toPositiveAmount = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

export const formatAmount = (amount: number): string =>
  `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** Every rate present on the listing, in display priority order. */
export const listRentalRates = (listing: RentalRateInput | null | undefined): ResolvedRate[] => {
  if (!listing) return [];
  return UNIT_PRIORITY.reduce<ResolvedRate[]>((acc, unit) => {
    const amount = toPositiveAmount(listing[FIELD_BY_UNIT[unit]]);
    if (amount !== null) acc.push({ unit, amount, ...UNIT_META[unit] });
    return acc;
  }, []);
};

/** The rate a card/overlay should headline, or null when nothing is priced. */
export const resolveRentalRate = (listing: RentalRateInput | null | undefined): ResolvedRate | null =>
  listRentalRates(listing)[0] ?? null;

export const hasAnyRentalRate = (listing: RentalRateInput | null | undefined): boolean =>
  listRentalRates(listing).length > 0;

export const formatRentalRate = (rate: ResolvedRate): string =>
  `${formatAmount(rate.amount)}${rate.suffix}`;

export interface ListingPriceInput extends RentalRateInput {
  mode?: string | null;
  price_sale?: number | string | null;
}

export const PRICE_TBD = 'Price TBD';

/**
 * Card-level price label. Never returns "Price TBD" while any rental rate
 * (including a monthly-only rate) or a sale price exists.
 */
export const formatListingPriceLabel = (listing: ListingPriceInput | null | undefined): string => {
  if (!listing) return PRICE_TBD;

  if (listing.mode === 'rent') {
    const rate = resolveRentalRate(listing);
    return rate ? formatRentalRate(rate) : PRICE_TBD;
  }

  const sale = toPositiveAmount(listing.price_sale);
  if (sale !== null) return formatAmount(sale);

  // Dual-purpose rows can carry rental rates without a sale price.
  const rate = resolveRentalRate(listing);
  return rate ? formatRentalRate(rate) : PRICE_TBD;
};

export interface RentalRateValidation {
  valid: boolean;
  /** Normalized values safe to persist (null where unset/invalid). */
  values: Record<RentalRateUnit, number | null>;
  errors: Partial<Record<RentalRateUnit | 'root', string>>;
}

/**
 * Validates the rental pricing step: at least one rate, each rate positive,
 * and longer periods never cheaper than the equivalent shorter period.
 */
export const validateRentalRates = (input: {
  price_hourly?: number | string | null;
  price_daily?: number | string | null;
  price_weekly?: number | string | null;
  price_monthly?: number | string | null;
}): RentalRateValidation => {
  const errors: RentalRateValidation['errors'] = {};
  const values = {} as Record<RentalRateUnit, number | null>;

  (Object.keys(FIELD_BY_UNIT) as RentalRateUnit[]).forEach((unit) => {
    const raw = input[FIELD_BY_UNIT[unit]];
    const amount = toPositiveAmount(raw);
    if (raw !== null && raw !== undefined && raw !== '' && amount === null) {
      errors[unit] = `Enter a ${unit} rate greater than $0.`;
    }
    values[unit] = amount;
  });

  if (!Object.values(values).some((v) => v !== null)) {
    errors.root = 'Add at least one rental rate (daily, weekly or monthly).';
  }

  if (values.daily !== null && values.hourly !== null && values.daily <= values.hourly) {
    errors.daily = 'The daily rate should be higher than the hourly rate.';
  }
  if (values.weekly !== null && values.daily !== null && values.weekly <= values.daily) {
    errors.weekly = 'The weekly rate should be higher than the daily rate.';
  }
  if (values.monthly !== null && values.weekly !== null && values.monthly <= values.weekly) {
    errors.monthly = 'The monthly rate should be higher than the weekly rate.';
  }
  if (values.monthly !== null && values.weekly === null && values.daily !== null && values.monthly <= values.daily) {
    errors.monthly = 'The monthly rate should be higher than the daily rate.';
  }

  return { valid: Object.keys(errors).length === 0, values, errors };
};

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD QUOTING
// ─────────────────────────────────────────────────────────────────────────────

export interface RentalQuoteLine {
  unit: Exclude<RentalRateUnit, 'hourly'>;
  /** How many whole periods of this unit are billed. */
  count: number;
  /** Rate charged per period. */
  rate: number;
  amount: number;
  label: string;
}

export interface RentalQuote {
  /** Inclusive day count the renter selected. */
  days: number;
  lines: RentalQuoteLine[];
  /** Base rental subtotal before service fee, delivery and tax. */
  subtotal: number;
  /** Single-line human summary, e.g. `1 month @ $1,000`. */
  breakdown: string;
  /**
   * True when the billed periods cover more calendar days than selected —
   * e.g. a 3-day stay on a monthly-only listing bills one full month.
   */
  roundedUp: boolean;
  /** Calendar days actually paid for once periods are rounded up. */
  billedDays: number;
}

const PERIOD_DAYS: Record<Exclude<RentalRateUnit, 'hourly'>, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

const PERIOD_ORDER: Exclude<RentalRateUnit, 'hourly'>[] = ['monthly', 'weekly', 'daily'];

/**
 * Cheapest valid combination of the host's configured periods for a stay of
 * `days`, using exact dynamic programming rather than naive daily multiplication.
 *
 * Handles listings that price only weekly or only monthly (a very common case
 * for commissary and long-term trailer leases): a 3-day request on a
 * monthly-only listing bills one month rather than rendering "Price TBD".
 * Never bills more than the cheapest covering combination — if a week is
 * cheaper than 6 remaining days, the week is used.
 *
 * Returns `null` when the listing has no daily/weekly/monthly rate configured.
 */
export const quoteRentalPeriod = (
  days: number,
  rates: RentalRateInput | null | undefined,
): RentalQuote | null => {
  if (!rates || !Number.isFinite(days) || days <= 0) return null;

  const available = PERIOD_ORDER.map((unit) => ({
    unit,
    length: PERIOD_DAYS[unit],
    rate: toPositiveAmount(rates[FIELD_BY_UNIT[unit]]),
  })).filter((p): p is { unit: Exclude<RentalRateUnit, 'hourly'>; length: number; rate: number } =>
    p.rate !== null,
  );

  if (!available.length) return null;

  const n = Math.min(Math.floor(days), 3660); // ~10 years, guards pathological input
  // cost[d] = cheapest way to cover at least d days.
  const cost = new Array<number>(n + 1).fill(Infinity);
  const pick = new Array<number>(n + 1).fill(-1);
  cost[0] = 0;

  for (let d = 1; d <= n; d += 1) {
    available.forEach((period, idx) => {
      const prev = Math.max(0, d - period.length);
      const candidate = cost[prev] + period.rate;
      if (candidate < cost[d]) {
        cost[d] = candidate;
        pick[d] = idx;
      }
    });
  }

  if (!Number.isFinite(cost[n]) || pick[n] < 0) return null;

  const counts = new Map<Exclude<RentalRateUnit, 'hourly'>, { count: number; rate: number }>();
  let billedDays = 0;
  for (let d = n; d > 0; ) {
    const period = available[pick[d]];
    const entry = counts.get(period.unit) ?? { count: 0, rate: period.rate };
    entry.count += 1;
    counts.set(period.unit, entry);
    billedDays += period.length;
    d = Math.max(0, d - period.length);
  }

  const lines: RentalQuoteLine[] = PERIOD_ORDER.filter((u) => counts.has(u)).map((unit) => {
    const { count, rate } = counts.get(unit)!;
    const noun = unit === 'monthly' ? 'month' : unit === 'weekly' ? 'week' : 'day';
    return {
      unit,
      count,
      rate,
      amount: count * rate,
      label: `${count} ${noun}${count > 1 ? 's' : ''} @ ${formatAmount(rate)}`,
    };
  });

  const subtotal = Number(lines.reduce((sum, l) => sum + l.amount, 0).toFixed(2));

  return {
    days: n,
    lines,
    subtotal,
    breakdown: lines.map((l) => l.label).join(' + '),
    roundedUp: billedDays > n,
    billedDays,
  };
};
