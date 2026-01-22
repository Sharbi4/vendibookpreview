import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import affirmLogo from '@/assets/affirm-logo.png';

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
        "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium",
        "bg-[#0fa0ea]/10 text-foreground border border-[#0fa0ea]/20",
        className
      )}
    >
      <img 
        src={affirmLogo} 
        alt="Affirm" 
        className="h-3.5 w-auto dark:invert"
      />
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
