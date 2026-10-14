/**
 * BuyerMatch visual tokens: charcoal ink, warm white, one orange accent (#FF5124).
 * Typographic hierarchy instead of icon badges; hairlines and soft shadows instead of boxes.
 */
export const bm = {
  page: 'buyermatch-theme mx-auto max-w-6xl bg-[#FAF8F5] px-4 pb-20 pt-8 text-[#1C1B1A] sm:px-8 sm:pt-12',
  eyebrow: 'text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8A847B]',
  h1: 'font-display text-[34px] font-normal leading-[1.08] tracking-[-0.02em] sm:text-[48px]',
  h2: 'font-display text-[24px] font-normal leading-tight tracking-[-0.01em] sm:text-[28px]',
  h3: 'text-[15px] font-semibold',
  lead: 'text-[16px] leading-7 text-[#5E5953] sm:text-[17px]',
  body: 'text-[14px] leading-6 text-[#5E5953]',
  note: 'text-[12px] leading-5 text-[#8A847B]',
  num: 'font-display text-[40px] font-normal leading-none tracking-[-0.03em] tabular-nums sm:text-[48px]',
  numSm: 'font-display text-[26px] font-normal leading-none tracking-[-0.02em] tabular-nums',
  label: 'mt-2 text-[13px] leading-5 text-[#8A847B]',
  card: 'rounded-[20px] bg-white shadow-[0_1px_2px_rgba(28,27,26,0.04),0_18px_40px_-24px_rgba(28,27,26,0.22)]',
  rule: 'border-[#ECE6DD]',
  accent: 'text-[#FF5124]',
  primary: 'inline-flex h-11 items-center whitespace-nowrap justify-center gap-2 rounded-full bg-[#FF5124] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#E8461C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5124] disabled:cursor-not-allowed disabled:opacity-50',
  quiet: 'inline-flex h-11 items-center whitespace-nowrap justify-center gap-2 rounded-full border border-[#E2DBD0] bg-white px-5 text-[14px] font-semibold text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
  link: 'text-[14px] font-semibold text-[#1C1B1A] underline decoration-[#FF5124] decoration-2 underline-offset-[5px] transition-colors hover:text-[#FF5124]',
  field: 'mt-2 block w-full rounded-xl border border-[#E2DBD0] bg-white px-4 py-3 text-[16px] text-[#1C1B1A] placeholder:text-[#A8A198] focus:border-[#1C1B1A] focus:outline-none',
  chip: 'inline-flex items-center gap-1.5 rounded-full bg-[#F3EEE7] px-3 py-1 text-[12px] font-semibold text-[#1C1B1A]',
} as const;

export const usd = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === '' || !Number.isFinite(Number(n)) ? null
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n));

export const shortDate = (s: string) => new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const place = (l: { city?: string | null; state?: string | null }) => [l.city, l.state].filter(Boolean).join(', ');
