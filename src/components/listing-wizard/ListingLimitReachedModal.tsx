import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { HostTier } from '@/hooks/useHostEntitlements';

interface ListingLimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: HostTier;
  limit: number;
  returnTo?: string;
}

const TIER_COPY: Record<HostTier, { name: string; nextTier: string; nextLine: string }> = {
  free: {
    name: 'Free plan',
    nextTier: 'Starter',
    nextLine: 'Starter unlocks up to 5 active listings and AI listing tools for $39/month.',
  },
  starter: {
    name: 'Starter plan',
    nextTier: 'Growth',
    nextLine: 'Growth unlocks unlimited active listings, the full tools bundle, and priority placement.',
  },
  pro: { name: 'Growth plan', nextTier: 'Operator', nextLine: 'Growth already includes unlimited listings.' },
  premium: { name: 'Operator plan', nextTier: 'Operator', nextLine: 'Operator includes unlimited listings.' },
};

/**
 * Friendly gate shown when a non-grandfathered host tries to publish beyond
 * their tier's active-listing limit. Publishing is never dead-ended — the
 * draft stays saved and the upgrade path is one tap away.
 */
export function ListingLimitReachedModal({
  open,
  onOpenChange,
  tier,
  limit,
  returnTo,
}: ListingLimitReachedModalProps) {
  const copy = TIER_COPY[tier] ?? TIER_COPY.free;
  const plansHref = returnTo
    ? `/pricing?returnTo=${encodeURIComponent(returnTo)}`
    : '/pricing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="font-display text-center text-xl">
            You've reached the {copy.name}'s {limit} active listing{limit === 1 ? '' : 's'} limit
          </DialogTitle>
          <DialogDescription className="text-center">
            Upgrade to publish more. <span className="font-medium text-foreground">Drafts are always free</span>{' '}
            — your listing is saved and ready to go live.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
          {copy.nextLine}
        </div>

        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep as draft
          </Button>
          <Button asChild>
            <Link to={plansHref}>See plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ListingLimitReachedModal;
