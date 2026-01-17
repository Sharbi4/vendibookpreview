import { Zap, Truck, FileCheck, CreditCard, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { cn } from '@/lib/utils';

interface ListingBadgesProps {
  hostVerified?: boolean;
  stripeConnected?: boolean;
  instantBook?: boolean;
  canDeliver?: boolean;
  hasRequiredDocs?: boolean;
  isFastResponder?: boolean;
  avgResponseTime?: string;
  isRental?: boolean;
  variant?: 'card' | 'detail';
  maxVisible?: number;
}

interface BadgeConfig {
  id: string;
  icon: React.ElementType;
  label: string;
  tooltip: string;
  className: string;
  priority: number;
}

export const ListingBadges = ({
  hostVerified,
  stripeConnected,
  instantBook,
  canDeliver,
  hasRequiredDocs,
  isFastResponder,
  avgResponseTime,
  isRental = true,
  variant = 'card',
  maxVisible = 3,
}: ListingBadgesProps) => {
  // Build badge list based on data
  const badges: BadgeConfig[] = [];

  if (instantBook && isRental) {
    badges.push({
      id: 'instant',
      icon: Zap,
      label: 'Instant',
      tooltip: 'Book and pay immediately – no waiting for approval',
      className: 'bg-amber-500 text-white border-0',
      priority: 1,
    });
  }

  if (canDeliver) {
    badges.push({
      id: 'delivery',
      icon: Truck,
      label: 'Delivers',
      tooltip: 'This listing can deliver to your location',
      className: 'bg-emerald-500 text-white border-0',
      priority: 2,
    });
  }

  if (isFastResponder) {
    badges.push({
      id: 'fast',
      icon: Clock,
      label: 'Fast',
      tooltip: avgResponseTime ? `Typically responds within ${avgResponseTime}` : 'Responds quickly to inquiries',
      className: 'bg-blue-500 text-white border-0',
      priority: 3,
    });
  }

  if (hasRequiredDocs) {
    badges.push({
      id: 'docs',
      icon: FileCheck,
      label: 'Docs',
      tooltip: 'This host requires documentation before booking',
      className: 'bg-slate-600 text-white border-0',
      priority: 5,
    });
  }

  // Sort by priority and limit
  const sortedBadges = badges.sort((a, b) => a.priority - b.priority);
  const visibleBadges = sortedBadges.slice(0, maxVisible);
  const hiddenCount = sortedBadges.length - maxVisible;

  if (variant === 'card') {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {visibleBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <Badge className={cn("text-xs font-medium flex items-center gap-1 px-2 py-0.5", badge.className)}>
                    <Icon className="h-3 w-3" />
                    {badge.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                  {badge.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  +{hiddenCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {sortedBadges.slice(maxVisible).map(b => b.label).join(', ')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Detail variant - larger badges with full labels
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 flex-wrap">
        {hostVerified && (
          <VerificationBadge isVerified={true} variant="starburst" size="md" showLabel />
        )}
        
        {stripeConnected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-primary/5 text-primary border-primary/20">
                <CreditCard className="h-3 w-3" />
                Secure Payments
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              This host accepts secure payments through Stripe
            </TooltipContent>
          </Tooltip>
        )}
        
        {sortedBadges.map((badge) => {
          const Icon = badge.icon;
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <Badge className={cn("text-xs font-medium flex items-center gap-1", badge.className)}>
                  <Icon className="h-3 w-3" />
                  {badge.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                {badge.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ListingBadges;
