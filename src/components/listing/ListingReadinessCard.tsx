import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useListingSpecs } from '@/hooks/useListingSpecs';
import {
  READINESS_LABELS,
  READINESS_LEVEL_BLURBS,
  nextActionsForListing,
} from '@/lib/listings/readiness';
import ReadinessDisclaimer from '@/components/listing/ReadinessDisclaimer';
import { cn } from '@/lib/utils';

interface Props {
  listingId: string;
  category?: string | null;
  mode?: string | null;
  /** Compact variant for dashboard cards. */
  variant?: 'full' | 'compact';
  /** Show the existing-listing invitation copy. */
  showExistingListingPrompt?: boolean;
  className?: string;
  maxActions?: number;
}

/**
 * Calm readiness meter plus the highest-value next actions. A live listing is
 * never described as failed, poor, incomplete, unverified or under review.
 */
export const ListingReadinessCard: React.FC<Props> = ({
  listingId,
  category,
  mode,
  variant = 'full',
  showExistingListingPrompt = false,
  className,
  maxActions = 4,
}) => {
  const navigate = useNavigate();
  const { values, readiness, loading } = useListingSpecs({ listingId, category, mode });
  const actions = nextActionsForListing(category, mode, values).slice(0, maxActions);

  const improve = (section?: string) =>
    navigate(`/listings/${listingId}/improve${section ? `?section=${section}` : ''}`);

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border/60 p-4 text-sm text-muted-foreground',
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Checking listing details…
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-card/60 p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {showExistingListingPrompt
              ? 'Make your listing easier for serious buyers to evaluate'
              : 'Listing detail'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {showExistingListingPrompt
              ? 'We found a few details you can add or confirm, such as equipment, power, water, condition, and what is included.'
              : READINESS_LEVEL_BLURBS[readiness.level]}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {READINESS_LABELS[readiness.level]}
        </Badge>
      </div>

      <div className="mt-4 space-y-1.5">
        <Progress value={readiness.score} className="h-2" />
        <p className="text-xs text-muted-foreground">{readiness.score}% of relevant details added</p>
      </div>

      {actions.length > 0 && variant === 'full' && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.section}
              onClick={() => improve(action.section)}
              className="rounded-lg border border-border/60 bg-background/40 p-3 text-left transition-colors hover:border-primary/50"
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                {action.title}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{action.why}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => improve()}>
          {showExistingListingPrompt ? 'Review suggested details' : 'Improve my listing'}
        </Button>
      </div>

      <ReadinessDisclaimer className="mt-4" />
    </div>
  );
};

export default ListingReadinessCard;
