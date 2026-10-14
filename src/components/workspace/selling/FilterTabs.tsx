import { cn } from '@/lib/utils';

export interface FilterTab<K extends string> {
  key: K;
  label: string;
  /** Shown after the label; omit to hide. */
  count?: number | null;
  /** Small orange dot: something in this tab needs the user. */
  attention?: boolean;
}

interface FilterTabsProps<K extends string> {
  tabs: FilterTab<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  className?: string;
}

/**
 * Underlined tab bar for list pages (Listings, Offers, Activity). Scrolls
 * sideways on phones instead of wrapping into several rows.
 */
export function FilterTabs<K extends string>({ tabs, value, onChange, label, className }: FilterTabsProps<K>) {
  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <div role="tablist" aria-label={label} className="flex min-w-max items-center gap-6 border-b border-[#ECE6DD]">
        {tabs.map((t) => {
          const active = t.key === value;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={cn(
                '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 pt-1 text-[13.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]',
                active ? 'border-[#1C1B1A] text-[#1C1B1A]' : 'border-transparent text-[#8A847B] hover:text-[#1C1B1A]',
              )}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span className={cn('rounded-full px-1.5 py-px text-[11.5px] tabular-nums', active ? 'bg-[#1C1B1A] text-white' : 'bg-[#F3EEE7] text-[#5E5953]')}>
                  {t.count}
                </span>
              )}
              {t.attention && <span aria-label="Needs your attention" className="h-1.5 w-1.5 rounded-full bg-[#FF5124]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
