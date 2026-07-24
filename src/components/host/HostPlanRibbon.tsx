import { Link } from 'react-router-dom';
import { Crown, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHostEntitlements, type HostTier } from '@/hooks/useHostEntitlements';

const TIER_LABEL: Record<HostTier, string> = {
  free: 'Free host',
  starter: 'Host Starter',
  pro: 'Host Pro',
  premium: 'Host Premium',
};

const TIER_BADGE: Record<HostTier, string> = {
  free: 'bg-muted text-muted-foreground border-border',
  starter: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  pro: 'bg-primary/15 text-primary border-primary/30',
  premium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
};

interface Props {
  className?: string;
}

/** Compact plan badge + upsell strip for host surfaces. */
export function HostPlanRibbon({ className = '' }: Props) {
  const { tier, isLoading, isPastDue } = useHostEntitlements();
  if (isLoading) return null;

  const isFree = tier === 'free';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <Crown className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Your plan:</span>
        <Badge variant="outline" className={`capitalize ${TIER_BADGE[tier]}`}>
          {TIER_LABEL[tier]}
        </Badge>
        {isPastDue && (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
            Payment retry
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isFree ? (
          <Button asChild size="sm" variant="dark-shine" className="rounded-xl">
            <Link to="/host/plans">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Unlock Host Pro
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link to="/account">Manage subscription</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default HostPlanRibbon;
