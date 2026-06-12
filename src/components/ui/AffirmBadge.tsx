import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AffirmWordmark } from '@/components/home/hero/panels/BrandWordmarks';

interface AffirmBadgeProps {
  price: number;
  className?: string;
  showTooltip?: boolean;
  showEstimate?: boolean;
}

// Affirm eligibility range: $35 - $30,000
const AFFIRM_MIN = 35;
const AFFIRM_MAX = 30000;

export const isAffirmEligible = (price: number): boolean => {
  return price >= AFFIRM_MIN && price <= AFFIRM_MAX;
};

const AffirmBadgeInner = forwardRef<HTMLDivElement, AffirmBadgeProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ price, className, showEstimate = false, ...props }, ref) => {
    const monthlyEstimate = Math.round(price / 12);

    return (
      <div ref={ref} className={cn("inline-flex items-center rounded-md bg-white/95 px-1.5 py-0.5 ring-1 ring-border/30", className)} {...props}>
        <AffirmWordmark className="h-3.5 w-auto" />
        {showEstimate && <span className="ml-1 text-[11px] font-medium text-neutral-900">~${monthlyEstimate}/mo</span>}
      </div>
    );
  }
);
AffirmBadgeInner.displayName = 'AffirmBadgeInner';

export const AffirmBadge = ({ price, className, showTooltip = true, showEstimate = false }: AffirmBadgeProps) => {
  if (!isAffirmEligible(price)) return null;

  if (!showTooltip) return <AffirmBadgeInner price={price} className={className} showEstimate={showEstimate} />;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AffirmBadgeInner price={price} className={className} showEstimate={showEstimate} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <p className="font-medium">Pay over time with Affirm</p>
          <p className="text-muted-foreground">0% APR available. 3-36 month terms.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
