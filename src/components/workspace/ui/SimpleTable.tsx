import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tableCls, ws } from './tokens';

const HIDE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

export interface SimpleColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Numbers right-align with tabular figures. */
  align?: 'left' | 'right';
  /** Hide the column below this breakpoint so phones keep the essentials. */
  hideBelow?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Visually hidden header (e.g. an actions column). */
  srOnlyHeader?: boolean;
}

export interface SimpleTableProps<T> {
  columns: SimpleColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Skeleton rows while loading. */
  loadingRows?: number;
  /** Rendered in place of the table when there are no rows (and not loading). */
  empty?: ReactNode;
  caption?: string;
  className?: string;
}

/** Hairline table for records (listings, payments, activity). Use inside `<Panel flush>`. */
export function SimpleTable<T>({ columns, rows, rowKey, loading, loadingRows = 3, empty, caption, className }: SimpleTableProps<T>) {
  if (!loading && rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={cn(tableCls.wrap, className)}>
      <table className={tableCls.table}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={tableCls.thead}>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(tableCls.th, c.align === 'right' && 'text-right', c.hideBelow && HIDE[c.hideBelow], c.className)}
              >
                {c.srOnlyHeader ? <span className="sr-only">{c.header}</span> : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: loadingRows }, (_, i) => (
                <tr key={`sk-${i}`} className={tableCls.tr} aria-hidden="true">
                  {columns.map((c) => (
                    <td key={c.key} className={cn(tableCls.td, c.hideBelow && HIDE[c.hideBelow])}>
                      <span className={cn(ws.skeleton, 'block h-4', c.align === 'right' ? 'ml-auto w-10' : 'w-28')} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={rowKey(row)} className={cn(tableCls.tr, tableCls.trHover)}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(tableCls.td, c.align === 'right' && tableCls.num, c.hideBelow && HIDE[c.hideBelow], c.className)}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {loading && <span className="sr-only" role="status">Loading</span>}
    </div>
  );
}
