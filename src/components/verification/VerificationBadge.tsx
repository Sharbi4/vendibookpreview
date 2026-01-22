import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import verifiedBadgeImg from '@/assets/verified-badge.png';

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  variant?: 'badge' | 'inline' | 'card' | 'starburst' | 'image';
  className?: string;
}

// Image-based verification badge
const VerifiedBadgeImage = ({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  };

  return (
    <img 
      src={verifiedBadgeImg} 
      alt="Verified" 
      className={cn(sizes[size], "object-contain", className)}
    />
  );
};

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

  // Image variant - just the badge image
  if (variant === 'image') {
    if (!isVerified) return null;
    
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex", className)}>
              <VerifiedBadgeImage size={size} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Identity verified via Stripe Identity</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Starburst variant - now uses the image
  if (variant === 'starburst') {
    if (!isVerified) return null;
    
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex", className)}>
              <VerifiedBadgeImage size={size} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Identity verified via Stripe Identity</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl border',
          isVerified
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800'
            : 'bg-muted/50 border-border',
          className
        )}
      >
        <div className="flex-shrink-0">
          {isVerified ? (
            <VerifiedBadgeImage size="lg" />
          ) : (
            <div className="p-2 rounded-full bg-muted">
              <Shield className={cn(iconSizes.lg, 'text-muted-foreground')} />
            </div>
          )}
        </div>
        <div>
          <p className={cn('font-medium', isVerified ? 'text-amber-700 dark:text-amber-400' : 'text-foreground')}>
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
                isVerified ? 'text-amber-600' : 'text-muted-foreground',
                className
              )}
            >
              {isVerified ? (
                <VerifiedBadgeImage size={size} />
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
              'gap-1.5',
              isVerified
                ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 hover:from-amber-100 hover:to-orange-100 border-amber-200 dark:from-amber-900/50 dark:to-orange-900/50 dark:text-amber-400 dark:border-amber-700'
                : 'bg-muted text-muted-foreground',
              className
            )}
          >
            {isVerified ? (
              <VerifiedBadgeImage size="sm" />
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

// Export the image component for direct use
export { VerifiedBadgeImage };
