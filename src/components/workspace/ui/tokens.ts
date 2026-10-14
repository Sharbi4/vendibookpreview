import { bm, usd, shortDate, place } from '@/components/monetization/buyerMatchUi';

/**
 * Workspace (/dashboard) visual tokens. Extends the BuyerMatch tokens (`bm`) so
 * every dashboard page and BuyerMatch share one palette: charcoal ink #1C1B1A,
 * warm white #FAF8F5, hairlines #ECE6DD and a single orange accent #FF5124.
 *
 * Dashboard type is set in Manrope (the UI face) with tabular figures, so
 * numbers line up in tiles and tables.
 */
export const ws = {
  ...bm,
  /** Page frame inside WorkspaceShell's <main>. */
  page: 'mx-auto w-full max-w-[1180px] text-[#1C1B1A]',
  /** Vertical rhythm between page sections. */
  stack: 'flex flex-col gap-10 sm:gap-14',
  eyebrow: 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A847B]',
  title: 'text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#1C1B1A] sm:text-[34px]',
  description: 'text-[15px] leading-6 text-[#5E5953]',
  sectionTitle: 'text-[15px] font-semibold tracking-[-0.01em] text-[#1C1B1A]',
  sectionNote: 'text-[13px] leading-5 text-[#8A847B]',
  /** Big tile figure. */
  value: 'text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#1C1B1A] sm:text-[32px]',
  valueSm: 'text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#1C1B1A]',
  label: 'text-[12.5px] font-medium leading-5 text-[#8A847B]',
  sub: 'text-[12.5px] leading-5 text-[#8A847B]',
  /** White surface with a soft two-layer shadow and no visible border. */
  surface: 'rounded-2xl bg-white shadow-[0_0_0_1px_rgba(28,27,26,0.05),0_1px_2px_rgba(28,27,26,0.04),0_12px_32px_-22px_rgba(28,27,26,0.22)]',
  hairline: 'border-[#ECE6DD]',
  divide: 'divide-[#ECE6DD]',
  /** Inline text link with the orange underline used across BuyerMatch. */
  link: 'text-[13px] font-semibold text-[#1C1B1A] underline decoration-[#FF5124]/70 decoration-[1.5px] underline-offset-[5px] transition-colors hover:text-[#FF5124]',
  /** Plain arrow link for panel actions ("View all →"). */
  actionLink: 'inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-[#5E5953] transition-colors hover:text-[#1C1B1A]',
  /** Secondary button (outlined pill). Pair with `<Button variant="cta">` for the one primary action. */
  secondary: 'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#E2DBD0] bg-white px-4 text-[13.5px] font-semibold text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]',
  /** Extra classes for `<Button variant="cta">` in the dashboard: pill, quieter glow. */
  cta: '!h-10 !rounded-full !px-5 text-[13.5px] !font-semibold !shadow-[0_1px_2px_rgba(28,27,26,0.12),0_8px_18px_-10px_rgba(255,81,36,0.7)]',
  skeleton: 'animate-pulse rounded-md bg-[#EFE9E1]',
} as const;

/** Class strings for hand-built tables that should match SimpleTable. */
export const tableCls = {
  wrap: 'w-full overflow-x-auto',
  table: 'w-full border-collapse text-left text-[13.5px]',
  thead: 'border-b border-[#ECE6DD]',
  th: 'whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A847B] first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
  tr: 'border-b border-[#F1ECE5] last:border-b-0',
  trHover: 'transition-colors hover:bg-[#FCFAF7]',
  td: 'px-4 py-3.5 align-middle text-[#1C1B1A] first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
  num: 'text-right tabular-nums',
  muted: 'text-[#8A847B]',
} as const;

/** Shown wherever a value is unknown (still loading failed, or not computable). Never a fake 0. */
export const UNKNOWN = '—';

type Maybe = number | null | undefined;
const known = (n: Maybe): n is number => typeof n === 'number' && Number.isFinite(n);

/** 1,234 or "—". */
export const formatCount = (n: Maybe) => (known(n) ? n.toLocaleString('en-US') : UNKNOWN);

/** Cents to "$1,234" (or "$1,234.50" with `{ cents: true }`), or "—". */
export const formatCents = (cents: Maybe, opts: { cents?: boolean } = {}) =>
  known(cents)
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: opts.cents ? 2 : 0,
        maximumFractionDigits: opts.cents ? 2 : 0,
      }).format(cents / 100)
    : UNKNOWN;

/** Whole dollars to "$1,234", or "—". */
export const formatDollars = (dollars: Maybe) => usd(dollars) ?? UNKNOWN;

/** "Oct 14" (adds the year when it isn't this year), or null. */
export const formatDay = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  });
};

/**
 * Resolve a count for display from a query's state: `undefined` while loading,
 * `null` when it failed (renders "—"), otherwise the number.
 */
export const metric = (n: number, state: { loading?: boolean; error?: boolean }) =>
  state.loading ? undefined : state.error ? null : n;

export { usd, shortDate, place };
