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

const toneClass = {
  default: 'text-foreground',
  warning: 'text-amber-600',
  critical: 'text-destructive',
} as const;

const iconWrap = {
  default: 'bg-muted text-foreground',
  warning: 'bg-amber-500/10 text-amber-600',
  critical: 'bg-destructive/10 text-destructive',
} as const;

const ActionRequiredStack = ({ items, className }: ActionRequiredStackProps) => {
  if (!items.length) return null;

  return (
    <section className={cn('rounded-2xl border border-border bg-card overflow-hidden', className)}>
      <header className="px-4 sm:px-5 pt-4 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Needs your attention
        </h2>
      </header>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          const tone = item.tone ?? 'default';
          return (
            <li key={item.id}>
              <Link
                to={item.href}
                className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-muted/40 transition-colors group"
              >
                <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', iconWrap[tone])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', toneClass[tone])}>{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.cta && (
                    <span className="hidden sm:inline text-xs font-medium text-foreground group-hover:underline underline-offset-2">
                      {item.cta}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
