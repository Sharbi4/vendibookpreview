import { Award, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
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
      }
    : {
        label: 'Top Rated',
        icon: Star,
        tooltip: 'Highly rated with fast response times and great reviews',
      };

  const Icon = badgeConfig.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ backgroundSize: '200% 200%' }}
            className="inline-flex"
          >
            <Badge 
              className={`bg-gradient-to-r from-[hsl(14,100%,57%)] via-[hsl(25,95%,55%)] to-[hsl(40,100%,49%)] text-white border-0 shadow-md gap-1 text-[10px] px-2 py-0.5 ${className}`}
            >
              <Icon className="h-3 w-3" />
              {badgeConfig.label}
            </Badge>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center">
          <p className="text-xs">{badgeConfig.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TopRatedBadge;
