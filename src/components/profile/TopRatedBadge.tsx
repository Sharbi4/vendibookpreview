import { Award, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TopRatedBadgeProps {
  isSuperhost?: boolean;
  isTopRated?: boolean;
  className?: string;
}

const TopRatedBadge = ({ isSuperhost, isTopRated, className = '' }: TopRatedBadgeProps) => {
  if (!isTopRated && !isSuperhost) return null;

  const badgeConfig = isSuperhost
    ? {
        label: 'Superhost',
        icon: Award,
        tooltip: 'This host has exceptional ratings, fast responses, and many successful bookings',
        className: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-sm',
      }
    : {
        label: 'Top Rated',
        icon: Star,
        tooltip: 'Highly rated with fast response times and great reviews',
        className: 'bg-gradient-to-r from-primary/80 to-primary text-primary-foreground border-0 shadow-sm',
      };

  const Icon = badgeConfig.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${badgeConfig.className} gap-1 text-[10px] px-2 py-0.5 ${className}`}>
            <Icon className="h-3 w-3" />
            {badgeConfig.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center">
          <p className="text-xs">{badgeConfig.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TopRatedBadge;
