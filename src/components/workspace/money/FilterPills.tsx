import { cn } from '@/lib/utils';

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  /** Optional count shown after the label. */
  count?: number;
}

/**
 * Segmented filter pills. The active pill is solid charcoal with white text,
 * set with fixed colours so a theme token can never make the label vanish.
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1', className)}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]',
              active
                ? 'border-[#1C1B1A] bg-[#1C1B1A] text-white'
                : 'border-[#E2DBD0] bg-white text-[#5E5953] hover:border-[#1C1B1A] hover:text-[#1C1B1A]',
            )}
          >
            {o.label}
            {typeof o.count === 'number' && (
              <span className={cn('tabular-nums', active ? 'text-white/70' : 'text-[#A8A198]')}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
