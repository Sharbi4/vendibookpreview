import { Link } from 'react-router-dom';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionItem {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  href: string;
  cta?: string;
  tone?: 'default' | 'warning' | 'critical';
}

interface ActionRequiredStackProps {
  items: ActionItem[];
  className?: string;
}

const toneText = {
  default: 'text-[rgb(var(--dash-text-1))]',
  warning: 'text-amber-400',
  critical: 'text-red-400',
} as const;

const iconWrap = {
  default: 'bg-white/[0.06] text-[rgb(var(--dash-text-1))]',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/40',
  critical: 'bg-red-500/15 text-red-400 border border-red-500/40',
} as const;

const leftAccent = {
  default: '',
  warning: 'before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-amber-500',
  critical: 'before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-red-500',
} as const;

const ActionRequiredStack = ({ items, className }: ActionRequiredStackProps) => {
  if (!items.length) return null;

  return (
    <section className={cn('dash-glass overflow-hidden', className)}>
      <header className="px-4 sm:px-5 pt-4 pb-2">
        <h2 className="dash-label">Needs your attention</h2>
      </header>
      <ul className="divide-y divide-white/[0.08]">
        {items.map((item) => {
          const Icon = item.icon;
          const tone = item.tone ?? 'default';
          return (
            <li key={item.id}>
              <Link
                to={item.href}
                className={cn(
                  'relative flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-white/[0.03] transition-colors group',
                  leftAccent[tone],
                )}
              >
                <div className={cn('h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0', iconWrap[tone])}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[14px] font-semibold truncate', toneText[tone])}>{item.title}</p>
                  {item.description && (
                    <p className="text-[12.5px] text-[rgb(var(--dash-text-2))] truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.cta && (
                    <span className="hidden sm:inline text-[12px] font-semibold text-[rgb(var(--dash-text-1))] group-hover:underline underline-offset-2">
                      {item.cta}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-[rgb(var(--dash-text-2))]" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ActionRequiredStack;
