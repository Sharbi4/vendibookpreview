import { Link } from 'react-router-dom';
import { ChevronRight, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  href: string;
  title: string;
  imageUrl?: string | null;
  meta?: string;
  status?: { label: string; tone?: 'success' | 'warning' | 'muted' | 'info' };
}

const toneStyles: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  muted: 'bg-white/5 text-[rgb(var(--dash-text-2))] border-white/10',
  info: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
};

interface Props {
  title?: string;
  items: ActivityItem[];
  emptyText?: string;
  emptyHref?: string;
  emptyCta?: string;
  viewAllHref?: string;
}

/**
 * Photo-forward "latest 3" strip for the Overview page. Every row navigates.
 */
const RecentActivityStrip = ({
  title = 'Recent activity',
  items,
  emptyText = 'Nothing yet.',
  emptyHref,
  emptyCta,
  viewAllHref,
}: Props) => {
  return (
    <section className="dash-glass overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="dash-label">{title}</h2>
        {viewAllHref && items.length > 0 && (
          <Link
            to={viewAllHref}
            className="text-[12px] font-medium text-[rgb(var(--dash-text-1))] hover:underline underline-offset-2"
          >
            View all
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <div className="px-5 pb-6 pt-2 text-center">
          <p className="text-sm text-[rgb(var(--dash-text-2))]">{emptyText}</p>
          {emptyHref && emptyCta && (
            <Link
              to={emptyHref}
              className="inline-flex mt-3 items-center gap-1.5 text-sm font-medium text-[rgb(var(--dash-text-1))] hover:underline"
            >
              {emptyCta} <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {items.slice(0, 3).map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="h-14 w-16 sm:h-16 sm:w-20 rounded-lg overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-[rgb(var(--dash-text-3))]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[rgb(var(--dash-text-1))] truncate">
                      {item.title}
                    </p>
                    {item.status && (
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                        toneStyles[item.status.tone ?? 'muted'],
                      )}>
                        {item.status.label}
                      </span>
                    )}
                  </div>
                  {item.meta && (
                    <p className="text-[12px] text-[rgb(var(--dash-text-2))] truncate mt-0.5">
                      {item.meta}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-[rgb(var(--dash-text-3))] group-hover:text-[rgb(var(--dash-text-1))] shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RecentActivityStrip;
