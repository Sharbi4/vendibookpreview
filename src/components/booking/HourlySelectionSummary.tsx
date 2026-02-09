import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HourlySelectionsByDate } from '@/lib/hourlySelections';

interface HourlySelectionSummaryProps {
  selections: HourlySelectionsByDate;
  variant?: 'compact' | 'full';
  className?: string;
}

const HourlySelectionSummary = ({
  selections,
  variant = 'full',
  className,
}: HourlySelectionSummaryProps) => {
  const dateKeys = Object.keys(selections).sort();
  if (dateKeys.length === 0) return null;

  return (
    <div className={cn('space-y-2', variant === 'compact' && 'space-y-1', className)}>
      {dateKeys.map((dateKey) => {
        const slots = (selections[dateKey] || []).slice().sort();
        if (slots.length === 0) return null;

        const label = (() => {
          try {
            return format(parseISO(dateKey), variant === 'compact' ? 'MMM d' : 'EEE, MMM d');
          } catch {
            return dateKey;
          }
        })();

        return (
          <div key={dateKey} className="flex items-start justify-between gap-3">
            <span
              className={cn(
                'text-xs font-medium text-muted-foreground whitespace-nowrap pt-0.5',
                variant === 'compact' && 'text-[11px]'
              )}
            >
              {label}
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              {slots.map((t) => (
                <Badge
                  key={`${dateKey}_${t}`}
                  variant="secondary"
                  className={cn('px-2 py-0.5 text-xs', variant === 'compact' && 'px-1.5 text-[11px]')}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HourlySelectionSummary;
