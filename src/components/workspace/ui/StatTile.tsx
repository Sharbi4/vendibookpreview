import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatCents, formatCount, ws, UNKNOWN } from './tokens';

export type StatFormat = 'count' | 'cents' | 'text';

export interface StatTileProps {
  label: ReactNode;
  /**
   * The figure. `undefined` (or `loading`) renders a skeleton; `null` renders
   * "—" (unknown or failed to load, never a fake 0). Numbers are formatted by
   * `format`; strings are shown as given.
   */
  value: number | string | null | undefined;
  format?: StatFormat;
  loading?: boolean;
  /** Quiet line under the value: context, a date, a breakdown. */
  sub?: ReactNode;
  /** A change you can actually compute, e.g. "+3 this week". */
  delta?: { label: ReactNode; tone?: 'up' | 'down' | 'neutral' };
  /** Makes the whole tile a link to the page where the number is managed. */
  to?: string;
  /** Orange figure for a count that needs action (use sparingly). */
  attention?: boolean;
  size?: 'md' | 'sm';
  className?: string;
}

const display = (value: StatTileProps['value'], format: StatFormat) => {
  if (value === null || value === undefined) return UNKNOWN;
  if (typeof value === 'string') return value;
  if (format === 'cents') return formatCents(value);
  if (format === 'count') return formatCount(value);
  return String(value);
};

/** One KPI: quiet label, big tabular figure, optional sub-line. Place inside `StatGrid`. */
export function StatTile({ label, value, format = 'count', loading, sub, delta, to, attention, size = 'md', className }: StatTileProps) {
  const isLoading = loading || value === undefined;
  const body = (
    <>
      <span className={ws.label}>{label}</span>
      {isLoading ? (
        <span aria-hidden="true" className={cn(ws.skeleton, 'mt-3 block', size === 'sm' ? 'h-5 w-16' : 'h-8 w-24')} />
      ) : (
        <span
          className={cn(size === 'sm' ? ws.valueSm : ws.value, 'mt-3 block', attention && value !== null && value !== 0 && 'text-[#FF5124]')}
          title={value === null ? 'Not available right now' : undefined}
        >
          {display(value, format)}
        </span>
      )}
      {isLoading && <span className="sr-only">Loading</span>}
      {(sub || delta) && !isLoading && (
        <span className={cn(ws.sub, 'mt-2 flex flex-wrap items-center gap-x-2')}>
          {delta && (
            <span className={cn('font-semibold tabular-nums', delta.tone === 'up' && 'text-[#1F7A4D]', delta.tone === 'down' && 'text-[#B42318]')}>
              {delta.label}
            </span>
          )}
          {sub && <span className="min-w-0">{sub}</span>}
        </span>
      )}
    </>
  );
  const base = cn('group flex min-w-0 flex-col bg-white p-5 sm:p-6', className);
  return to ? (
    <Link to={to} className={cn(base, 'transition-colors hover:bg-[#FCFAF7] focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1C1B1A]')}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

export interface StatGridProps {
  children: ReactNode;
  /** Columns at desktop width; mobile is always 2 (1 when `cols` is 1). */
  cols?: 1 | 2 | 3 | 4;
  /** Accessible name for the group, e.g. "Money". */
  label?: string;
  /** `card` (default) is a standalone surface; `flat` sits inside a Panel with no shadow or radius. */
  variant?: 'card' | 'flat';
  className?: string;
}

const COLS: Record<NonNullable<StatGridProps['cols']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2',
  // An odd tile count on the 2-column mobile grid: the last tile spans the row
  // so no empty hairline-coloured cell shows.
  3: 'grid-cols-2 lg:grid-cols-3 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2',
  4: 'grid-cols-2 lg:grid-cols-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2',
};

/** A card of StatTiles separated by hairlines (the 1px gap shows the rule colour). */
export function StatGrid({ children, cols = 4, label, variant = 'card', className }: StatGridProps) {
  return (
    <div role="group" aria-label={label} className={cn(variant === 'card' && ws.surface, 'grid gap-px overflow-hidden bg-[#ECE6DD]', COLS[cols], className)}>
      {children}
    </div>
  );
}
