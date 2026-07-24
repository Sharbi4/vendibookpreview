import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'muted' | 'info';

const toneStyles: Record<Tone, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  muted: 'bg-muted text-muted-foreground border-border',
  info: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
};

interface Props {
  label: string;
  tone?: Tone;
  title: string;
  body: string;
  nextStep?: string;
  className?: string;
}

/**
 * A status chip that opens a popover explaining "what this status means and
 * what happens next" — used across orders, sales, and bookings so no chip is
 * a dead click.
 */
const StatusChipPopover = ({ label, tone = 'muted', title, body, nextStep, className }: Props) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded-full border cursor-pointer hover:brightness-110 transition',
          toneStyles[tone],
          className,
        )}
      >
        {label}
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="w-72"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{body}</p>
      {nextStep && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            What happens next
          </p>
          <p className="mt-1 text-xs text-foreground">{nextStep}</p>
        </div>
      )}
    </PopoverContent>
  </Popover>
);

export default StatusChipPopover;
