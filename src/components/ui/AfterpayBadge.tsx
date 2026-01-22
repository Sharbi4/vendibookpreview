import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import afterpayLogo from '@/assets/afterpay-logo.png';

interface AfterpayBadgeProps {
  price: number;
  className?: string;
  showTooltip?: boolean;
  showEstimate?: boolean;
}

// Afterpay eligibility range: $35 - $4,000 (US limits)
const AFTERPAY_MIN = 35;
const AFTERPAY_MAX = 4000;

export const isAfterpayEligible = (price: number): boolean => {
  return price >= AFTERPAY_MIN && price <= AFTERPAY_MAX;
};

export const AfterpayBadge = ({ price, className, showTooltip = true, showEstimate = false }: AfterpayBadgeProps) => {
  if (!isAfterpayEligible(price)) return null;

  // Afterpay splits into 4 payments
  const paymentAmount = Math.round(price / 4);

  const badge = (
    <div className={cn("inline-flex items-center", className)}>
      <img 
        src={afterpayLogo} 
        alt="Afterpay" 
        className="h-4 w-auto dark:invert"
      />
      {showEstimate && <span className="ml-1 text-[11px] font-medium">4 × ${paymentAmount}</span>}
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
          <p className="font-medium">Pay in 4 with Afterpay</p>
          <p className="text-muted-foreground">Split into 4 interest-free payments.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
