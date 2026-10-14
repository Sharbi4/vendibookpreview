import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ws } from './tokens';

export interface ActionItem {
  id: string;
  /** What needs doing, with the count in it: "2 offers waiting on you". */
  title: ReactNode;
  /** One line of context: amount, listing, deadline. */
  detail?: ReactNode;
  /** Where the action is taken. */
  to: string;
  /** Verb for the link: "Review", "Reply", "Request payout". Defaults to "Open". */
  cta?: string;
  /** Time-sensitive or blocking (money, deadlines, disputes). Shown first with an orange marker. */
  urgent?: boolean;
  /** Right-aligned figure, e.g. an amount. */
  meta?: ReactNode;
}

export interface ActionListProps {
  items: ActionItem[];
  loading?: boolean;
  /** Show at most this many; the rest are summarised in a "+N more" line. */
  max?: number;
  /** Link for the "+N more" line. */
  moreHref?: string;
  /** Rendered when there are no items and nothing is loading. */
  empty?: ReactNode;
  className?: string;
}

/** Prioritised to-do rows with a direct link each. Sorts urgent items first, keeping input order otherwise. */
export function ActionList({ items, loading, max, moreHref, empty, className }: ActionListProps) {
  if (loading) {
    return (
      <ul className={cn('divide-y divide-[#F1ECE5]', className)} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
            <span className="min-w-0 flex-1 space-y-2">
              <span className={cn(ws.skeleton, 'block h-4 w-56 max-w-full')} />
              <span className={cn(ws.skeleton, 'block h-3 w-40 max-w-full')} />
            </span>
          </li>
        ))}
        <li className="sr-only" role="status">Loading</li>
      </ul>
    );
  }
  if (!items.length) return <>{empty ?? null}</>;
  const sorted = [...items].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  const shown = max ? sorted.slice(0, max) : sorted;
  const rest = sorted.length - shown.length;
  return (
    <ul className={cn('divide-y divide-[#F1ECE5]', className)}>
      {shown.map((item) => (
        <li key={item.id}>
          <Link
            to={item.to}
            className="group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FCFAF7] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1C1B1A] sm:px-6"
          >
            {item.urgent && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[#FF5124]" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-5 text-[#1C1B1A]">{item.title}</span>
              {item.detail && <span className="mt-0.5 block truncate text-[13px] leading-5 text-[#8A847B]">{item.detail}</span>}
            </span>
            {item.meta && <span className="hidden shrink-0 text-[14px] font-semibold tabular-nums text-[#1C1B1A] sm:block">{item.meta}</span>}
            <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#5E5953] transition-colors group-hover:text-[#1C1B1A]">
              <span className="hidden sm:inline">{item.cta ?? 'Open'}</span>
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
      {rest > 0 && (
        <li className="px-5 py-3 sm:px-6">
          {moreHref ? <Link to={moreHref} className={ws.actionLink}>+{rest} more</Link> : <span className={ws.sub}>+{rest} more</span>}
        </li>
      )}
    </ul>
  );
}
