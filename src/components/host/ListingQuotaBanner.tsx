import { Link } from 'react-router-dom';
import { AlertTriangle, Infinity as InfinityIcon, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useListingQuota } from '@/hooks/useListingQuota';

interface Props {
  className?: string;
}

/**
 * Compact banner showing published-listing quota use and upsell when
 * approaching / at the tier limit.
 */
export function ListingQuotaBanner({ className = '' }: Props) {
  const { tier, limit, used, remaining, isUnlimited, isAtLimit, percent, isLoading } =
    useListingQuota();

  if (isLoading) return null;

  if (isUnlimited) {
    return (
      <div
        className={`flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-sm ${className}`}
      >
        <InfinityIcon className="h-4 w-4 text-primary" />
        <span>
          <span className="text-foreground font-medium">Unlimited listings</span> with your{' '}
          <span className="capitalize">Host {tier}</span> plan · {used} active
        </span>
      </div>
    );
  }

  const near = !isAtLimit && percent >= 80;

  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 flex flex-col gap-2.5 ${
        isAtLimit
          ? 'border-amber-500/40 bg-amber-500/10'
          : near
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border bg-card'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          {(isAtLimit || near) && (
            <AlertTriangle className={`h-4 w-4 ${isAtLimit ? 'text-amber-600' : 'text-amber-500'}`} />
          )}
          <span className="text-foreground font-medium">
            {used} of {limit} active listings used
          </span>
          {!isAtLimit && remaining !== null && (
            <span className="text-muted-foreground">· {remaining} remaining</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground capitalize">Host {tier}</span>
      </div>

      <Progress value={percent} className="h-1.5" />

      {(isAtLimit || near) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-xs text-muted-foreground max-w-md">
            {isAtLimit
              ? 'You’ve hit your plan’s active-listing limit. Upgrade to publish more spaces without pausing existing ones.'
              : 'You’re close to your plan’s limit. Upgrade for more headroom and priority placement.'}
          </p>
          <Button asChild size="sm" variant="dark-shine" className="rounded-xl">
            <Link to="/host/plans">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Upgrade plan
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default ListingQuotaBanner;
