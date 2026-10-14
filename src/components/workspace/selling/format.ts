/** Formatting helpers for the selling and buying list pages. */

/** "approved · payment_pending" → "Approved · payment pending". */
export const humanize = (s: string | null | undefined) => {
  const t = (s ?? '').replace(/_/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
};

/** Whole dollars (offers and listing prices are stored in dollars). */
export const dollars = (n: number | string | null | undefined) => {
  const v = typeof n === 'string' ? Number(n) : n;
  return typeof v === 'number' && Number.isFinite(v)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: v % 1 ? 2 : 0 }).format(v)
    : null;
};

/** Time left until a deadline: "1 day 19 hr left", "45 min left", or null when passed. */
export const timeLeft = (deadline: number, now = Date.now()) => {
  const ms = deadline - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  const days = Math.floor(mins / 1440);
  const hrs = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}${hrs ? ` ${hrs} hr` : ''} left`;
  if (hrs > 0) return `${hrs} hr ${mins % 60} min left`;
  return `${Math.max(1, mins)} min left`;
};

/** "Oct 16, 3:00 PM". */
export const dayTime = (ms: number) =>
  new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
