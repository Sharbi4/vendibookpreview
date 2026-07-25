import { useQuery } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type VideoId = 'buying' | 'renting' | 'selling' | 'hosting';
const VIDEOS: { id: VideoId; label: string }[] = [
  { id: 'buying', label: 'Buying' },
  { id: 'renting', label: 'Renting' },
  { id: 'selling', label: 'Selling' },
  { id: 'hosting', label: 'Hosting' },
];

interface Row {
  video_id: VideoId;
  views: number;
  completes: number;
  completionRate: number;
}

const useHomepageVideoStats = (days: number) => {
  return useQuery<Row[]>({
    queryKey: ['admin-homepage-video-stats', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_name, metadata')
        .in('event_name', ['video_view', 'video_complete'])
        .gte('created_at', since.toISOString())
        .limit(5000);
      if (error) throw error;

      const counts: Record<VideoId, { views: number; completes: number }> = {
        buying: { views: 0, completes: 0 },
        renting: { views: 0, completes: 0 },
        selling: { views: 0, completes: 0 },
        hosting: { views: 0, completes: 0 },
      };
      for (const row of data || []) {
        const md = (row as { metadata: Record<string, unknown> | null }).metadata || {};
        const vid = md.video_id as VideoId | undefined;
        if (!vid || !counts[vid]) continue;
        if ((row as { event_name: string }).event_name === 'video_view') counts[vid].views += 1;
        else counts[vid].completes += 1;
      }
      return VIDEOS.map(({ id }) => {
        const c = counts[id];
        return {
          video_id: id,
          views: c.views,
          completes: c.completes,
          completionRate: c.views > 0 ? Math.round((c.completes / c.views) * 100) : 0,
        };
      });
    },
    staleTime: 60_000,
  });
};

export const HomepageVideoStatsCard = ({ days = 7 }: { days?: number }) => {
  const { data, isLoading } = useHomepageVideoStats(days);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-foreground/70" />
          <CardTitle className="text-base">Homepage videos</CardTitle>
        </div>
        <CardDescription>Views (≥3s watched) and completion rate — last {days} days</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {VIDEOS.map((v) => (
              <Skeleton key={v.id} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(data ?? []).map((row) => {
              const label = VIDEOS.find((v) => v.id === row.video_id)?.label ?? row.video_id;
              return (
                <div
                  key={row.video_id}
                  className="rounded-lg border border-border/70 bg-card/60 p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {row.views.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    views
                  </p>
                  <p className="mt-1.5 text-xs text-foreground/80">
                    <span className="font-semibold">{row.completionRate}%</span>{' '}
                    <span className="text-muted-foreground">
                      complete · {row.completes.toLocaleString()}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HomepageVideoStatsCard;
