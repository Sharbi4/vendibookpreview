import { LucideIcon, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirbnbFieldRowProps {
  label: string;
  value?: string | null;
  description?: string;
  action?: 'Edit' | 'Add' | 'Start' | 'Create' | 'Update' | 'Connect' | 'View';
  onAction?: () => void;
  locked?: boolean;
  lockedReason?: string;
  showDivider?: boolean;
  icon?: LucideIcon;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  statusText?: string;
  className?: string;
}

export const AirbnbFieldRow = ({
  label,
  value,
  description,
  action,
  onAction,
  locked,
  lockedReason,
  showDivider = true,
  icon: Icon,
  status,
  statusText,
  className,
}: AirbnbFieldRowProps) => {
  const displayValue = value || 'Not provided';
  const hasValue = !!value;

  const statusColors = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'py-4',
        showDivider && 'border-b border-border',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="font-medium text-foreground text-sm">{label}</span>
            {locked && (
              <Lock className="h-3 w-3 text-amber-500" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <p className={cn(
              'text-sm',
              hasValue ? 'text-muted-foreground' : 'text-muted-foreground/60'
            )}>
              {displayValue}
            </p>
            {status && statusText && (
              <span className={cn('text-xs font-medium', statusColors[status])}>
                {statusText}
              </span>
            )}
          </div>

          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
          
          {locked && lockedReason && (
            <p className="text-xs text-amber-600 mt-1">
              {lockedReason}
            </p>
          )}
        </div>

        {!locked && action && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 text-sm font-medium text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
};

export default AirbnbFieldRow;
