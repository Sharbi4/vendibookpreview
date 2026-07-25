import { FileSignature } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TrustESignChipProps {
  variant?: 'card' | 'inline' | 'row';
  className?: string;
  /** Override the default tooltip copy. */
  tooltip?: string;
  /** Include a short label after the icon. */
  label?: string;
}

/**
 * Standard trust chip that surfaces the free e-signature promise across
 * plans, listing cards, checkout, and the publish wizard. Never gated —
 * every user (free through Operator) gets e-signatures on every agreement.
 */
export function TrustESignChip({
  variant = 'inline',
  className,
  tooltip = 'Agreements and bills of sale are signed online, free.',
  label = 'e-sign ready',
}: TrustESignChipProps) {
  // Compact on-image variant for listing cards
  const base =
    variant === 'card'
      ? 'inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border-[1.5px] border-white/25 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 shadow-lg'
      : variant === 'row'
      ? 'inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200 text-[11px] font-medium px-2.5 py-1'
      : 'inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80';

  const iconClass = variant === 'card' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  const content = (
    <span className={cn(base, className)}>
      <FileSignature className={iconClass} />
      {label}
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px]">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default TrustESignChip;
