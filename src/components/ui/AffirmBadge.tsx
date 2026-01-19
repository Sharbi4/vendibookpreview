import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AffirmBadgeProps {
  price: number;
  className?: string;
  showTooltip?: boolean;
}

// Affirm eligibility range: $35 - $30,000
const AFFIRM_MIN = 35;
const AFFIRM_MAX = 30000;

export const isAffirmEligible = (price: number): boolean => {
  return price >= AFFIRM_MIN && price <= AFFIRM_MAX;
};

export const AffirmBadge = ({ price, className, showTooltip = true }: AffirmBadgeProps) => {
  if (!isAffirmEligible(price)) return null;

  const monthlyEstimate = Math.round(price / 12);

  const badge = (
    <div 
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        "bg-[#0fa0ea]/10 text-[#0fa0ea] border border-[#0fa0ea]/20",
        className
      )}
    >
      <svg 
        viewBox="0 0 450 170" 
        className="h-3 w-auto"
        fill="currentColor"
      >
        <path d="M387.5 0c-25.9 0-47.6 17.8-53.6 41.8h-7.7c-5.4 0-10.4 2.9-13.1 7.6l-72.6 126.1c-1.9 3.4.5 7.6 4.4 7.6h31.9c5.4 0 10.4-2.9 13.1-7.6l23.4-40.7h10.4c6 24 27.7 41.8 53.6 41.8 30.4 0 55.1-24.7 55.1-55.1V55.1C442.6 24.7 417.9 0 387.5 0zm17.7 121.5c0 9.8-7.9 17.7-17.7 17.7s-17.7-7.9-17.7-17.7V55.1c0-9.8 7.9-17.7 17.7-17.7s17.7 7.9 17.7 17.7v66.4zM151.1 0c-5.4 0-10.4 2.9-13.1 7.6L65.4 126.1c-1.9 3.4.5 7.6 4.4 7.6h31.9c5.4 0 10.4-2.9 13.1-7.6l10.3-17.9h42.2l10.3 17.9c2.7 4.7 7.7 7.6 13.1 7.6h31.9c3.9 0 6.3-4.2 4.4-7.6L154.2 7.6c-2.7-4.7-7.7-7.6-13.1-7.6zm0 71.4L133 41.8l18.1 29.6h-36.2zM262.8 0h-31.9c-3.9 0-6.3 4.2-4.4 7.6l72.6 126.1c2.7 4.7 7.7 7.6 13.1 7.6h31.9c3.9 0 6.3-4.2 4.4-7.6L275.9 7.6c-2.7-4.7-7.7-7.6-13.1-7.6zM55.1 0H23.2c-5.4 0-10.4 2.9-13.1 7.6L.8 23.4c-1.9 3.4.5 7.6 4.4 7.6h32.2v94.7c0 4 3.3 7.3 7.3 7.3h17.7c4 0 7.3-3.3 7.3-7.3V7.3c0-4-3.3-7.3-7.3-7.3z"/>
      </svg>
      <span>~${monthlyEstimate}/mo</span>
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <p className="font-medium">Pay over time with Affirm</p>
          <p className="text-muted-foreground">0% APR available. 3-36 month terms.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
