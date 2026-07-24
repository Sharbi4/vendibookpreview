import { useState } from 'react';
import { RefreshCw, TrendingUp, AlertTriangle, ChevronDown, ChevronRight, Activity, Loader2, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useListingInsights, useGenerateInsights, useAllHostInsights, AIRecommendation } from '@/hooks/useListingInsights';
import { useHostListings } from '@/hooks/useHostListings';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const severityStyles: Record<AIRecommendation['severity'], string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  low: 'bg-muted text-muted-foreground border-border'};

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-destructive';
};

const scoreLabel = (score: number) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs work';
  return 'Critical';
};

interface ListingRowProps {
  listingId: string;
  title: string;
  coverImage?: string | null;
  cachedScore?: number;
}

const ListingInsightRow = ({ listingId, title, coverImage, cachedScore }: ListingRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const { data: insight, isLoading } = useListingInsights(expanded ? listingId : undefined);
  const generate = useGenerateInsights();

  const score = insight?.health_score ?? cachedScore;
  const recs = insight?.recommendations ?? [];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
      >
        {coverImage ? (
          <img src={coverImage} alt={title} className="h-12 w-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {score != null ? (
            <div className="flex items-center gap-2 mt-1">
              <Progress value={score} className="h-1.5 flex-1 max-w-[140px]" />
              <span className={cn('text-xs font-semibold', scoreColor(score))}>
                {score}/100 · {scoreLabel(score)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Not analyzed yet</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3 bg-muted/20">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading insights…</span>
            </div>
          ) : !insight ? (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground mb-2">No AI analysis yet for this listing.</p>
              <Button
                size="sm"
                variant="dark-shine"
                className="rounded-lg h-8"
                disabled={generate.isPending}
                onClick={() => generate.mutate(listingId)}
              >
                {generate.isPending && generate.variables === listingId ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : null}
                Generate AI insights
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Generated {formatDistanceToNow(new Date(insight.generated_at), { addSuffix: true })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 rounded-lg"
                  disabled={generate.isPending}
                  onClick={() => generate.mutate(listingId)}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', generate.isPending && 'animate-spin')} />
                </Button>
              </div>

              {insight.competitor_summary?.summary && (
                <div className="text-xs bg-background border border-border rounded-lg p-2.5">
                  <p className="font-medium text-foreground mb-0.5 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Market context
                  </p>
                  <p className="text-muted-foreground">{insight.competitor_summary.summary}</p>
                </div>
              )}

              <div className="space-y-2">
                {recs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No recommendations — your listing is in great shape! 🎉
                  </p>
                ) : (
                  recs.map((rec, i) => (
                    <div
                      key={i}
                      className={cn('rounded-lg border p-2.5 text-xs', severityStyles[rec.severity])}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold">{rec.title}</p>
                        <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                          {rec.type}
                        </Badge>
                      </div>
                      <p className="opacity-90 mb-1">{rec.action}</p>
                      <p className="opacity-70 italic flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {rec.expected_impact}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const ListingInsightsPanel = () => {
  const { user } = useAuth();
  const { listings, isLoading } = useHostListings();
  const { data: cached } = useAllHostInsights(user?.id);
  const generate = useGenerateInsights();

  const published = listings.filter((l) => l.status === 'published');
  const cachedMap = new Map(cached?.map((c) => [c.listing_id, c.health_score]) ?? []);

  const avgScore = cached?.length
    ? Math.round(cached.reduce((s, c) => s + c.health_score, 0) / cached.length)
    : null;

  const handleAnalyzeAll = async () => {
    for (const l of published) {
      if (!cachedMap.has(l.id)) {
        await generate.mutateAsync(l.id).catch(() => null);
      }
    }
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-sm">
              <Wand2 className="h-4 w-4" />
            </div>
            Listing Health Scores
            <Badge variant="outline" className="ml-1 text-[10px]">AI</Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            {avgScore != null && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Portfolio avg</p>
                <p className={cn('text-lg font-bold', scoreColor(avgScore))}>{avgScore}/100</p>
              </div>
            )}
            <Button
              size="sm"
              variant="dark-shine"
              className="rounded-xl h-9"
              onClick={handleAnalyzeAll}
              disabled={generate.isPending || published.length === 0}
            >
              {generate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : null}
              Analyze all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : published.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Publish at least one listing to start receiving AI insights.
          </div>
        ) : (
          published.map((l) => (
            <ListingInsightRow
              key={l.id}
              listingId={l.id}
              title={l.title}
              coverImage={l.cover_image_url}
              cachedScore={cachedMap.get(l.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ListingInsightsPanel;
