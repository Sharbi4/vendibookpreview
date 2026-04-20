import { useMemo } from 'react';
import { useHostAnalytics, aggregateAnalytics } from '@/hooks/useHostAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Search, Facebook, Instagram, Music2, Twitter, Youtube, Link as LinkIcon } from 'lucide-react';

const SOURCE_META: Record<string, { label: string; icon: any; color: string }> = {
  google: { label: 'Google', icon: Search, color: 'text-sky-400' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-400' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-400' },
  tiktok: { label: 'TikTok', icon: Music2, color: 'text-foreground' },
  twitter: { label: 'X (Twitter)', icon: Twitter, color: 'text-foreground' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-400' },
  internal: { label: 'Vendibook', icon: LinkIcon, color: 'text-emerald-400' },
  direct: { label: 'Direct', icon: Globe, color: 'text-foreground/70' },
  other: { label: 'Other', icon: Globe, color: 'text-foreground/70' },
};

export const TrafficSourcesCard = ({ days = 30 }: { days?: number }) => {
  const { data, isLoading } = useHostAnalytics(days);
  const { sources } = useMemo(() => aggregateAnalytics(data || []), [data]);

  const total = Object.values(sources).reduce((s, n) => s + n, 0);
  const sorted = Object.entries(sources).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Traffic Sources</h3>
        <span className="text-xs text-muted-foreground">Last {days}d</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : total === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/40 rounded-lg">
          No traffic yet
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map(([src, count]) => {
            const meta = SOURCE_META[src] || SOURCE_META.other;
            const Icon = meta.icon;
            const pct = (count / total) * 100;
            return (
              <div key={src}>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    {meta.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {count.toLocaleString()} <span className="text-foreground/60">({pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full bg-foreground/60" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrafficSourcesCard;
