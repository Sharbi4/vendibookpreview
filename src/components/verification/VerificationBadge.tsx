import { ShieldCheck, Shield, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'badge' | 'inline' | 'card';
  className?: string;
}

const VerificationBadge = ({
  isVerified,
  size = 'md',
  showLabel = true,
  variant = 'badge',
  className,
}: VerificationBadgeProps) => {
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl border',
          isVerified
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
            : 'bg-muted/50 border-border',
          className
        )}
      >
        <div
          className={cn(
            'p-2 rounded-full',
            isVerified ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'
          )}
        >
          {isVerified ? (
            <ShieldCheck className={cn(iconSizes.lg, 'text-emerald-600')} />
          ) : (
            <Shield className={cn(iconSizes.lg, 'text-muted-foreground')} />
          )}
        </div>
        <div>
          <p className={cn('font-medium', isVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground')}>
            {isVerified ? 'Identity Verified' : 'Not Verified'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isVerified
              ? 'This user has verified their identity'
              : 'Identity verification pending'}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'inline-flex items-center gap-1.5',
                isVerified ? 'text-emerald-600' : 'text-muted-foreground',
                className
              )}
            >
              {isVerified ? (
                <ShieldCheck className={iconSizes[size]} />
              ) : (
                <Shield className={iconSizes[size]} />
              )}
              {showLabel && (
                <span className={cn(textSizes[size], 'font-medium')}>
                  {isVerified ? 'Verified' : 'Unverified'}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isVerified
                ? 'Identity verified via Stripe Identity'
                : 'Identity not yet verified'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default badge variant
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Badge
            variant={isVerified ? 'default' : 'secondary'}
            className={cn(
              'gap-1',
              isVerified
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
              className
            )}
          >
            {isVerified ? (
              <ShieldCheck className={iconSizes[size]} />
            ) : (
              <Shield className={iconSizes[size]} />
            )}
            {showLabel && (isVerified ? 'Verified' : 'Unverified')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isVerified
              ? 'Identity verified via Stripe Identity'
              : 'Identity not yet verified'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerificationBadge;
