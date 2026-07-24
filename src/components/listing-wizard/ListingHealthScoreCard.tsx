import React from 'react';
import { RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useListingInsights, useGenerateInsights } from '@/hooks/useListingInsights';
import { trackLeadEvent } from '@/lib/leadTracking';
import { cn } from '@/lib/utils';

interface Props {
  listingId?: string;
  className?: string;
}

/**
 * Small review-step widget that surfaces the persisted AI health score
 * from listing_ai_insights and lets the host refresh it on demand.
 */
export const ListingHealthScoreCard: React.FC<Props> = ({ listingId, className }) => {
  const { data: insight, isLoading } = useListingInsights(listingId);
  const generate = useGenerateInsights();

  if (!listingId) return null;

  const score = insight?.health_score;
  const generatedAt = insight?.generated_at ? new Date(insight.generated_at) : null;
  const tone =
    score == null
      ? 'text-muted-foreground'
      : score >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : score >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  const handleRefresh = () => {
    trackLeadEvent('ai_copilot_opened', {
      listing_id: listingId,
      surface: 'publish_wizard_review',
      action: 'refresh_health_score',
    });
    generate.mutate(listingId);
  };

  return (
    <div className={cn('bg-muted/30 rounded-xl p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-foreground" />
          <h4 className="text-sm font-medium text-foreground">AI listing health</h4>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={generate.isPending || isLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1', generate.isPending && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={cn('text-3xl font-semibold tabular-nums', tone)}>
          {score != null ? score : '—'}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>

      <p className="text-xs text-muted-foreground mt-1">
        {score == null
          ? 'No score yet. Refresh to generate one from your current listing details.'
          : generatedAt
          ? `Updated ${generatedAt.toLocaleString()}`
          : 'Latest score available.'}
      </p>

      {insight?.recommendations?.length ? (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {insight.recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{rec.title}:</span> {rec.action}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ListingHealthScoreCard;
