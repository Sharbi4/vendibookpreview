import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingUp, MapPin, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DemandRow {
  city: string;
  searches: number;
  matched_listings: number;
  gap: number;
}

/**
 * Shows hosts where demand is happening with low/no inventory.
 * Pulls from analytics_events (search events) vs published listings count.
 */
export const DemandHeatmap = () => {
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [{ data: events }, { data: listings }] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('city')
          .gte('created_at', since)
          .not('city', 'is', null)
          .limit(5000),
        supabase
          .from('listings')
          .select('city')
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .not('city', 'is', null)
          .limit(5000),
      ]);

      const searchCounts = new Map<string, number>();
      (events || []).forEach((e: any) => {
        const c = (e.city as string)?.trim();
        if (c) searchCounts.set(c, (searchCounts.get(c) || 0) + 1);
      });
      const listingCounts = new Map<string, number>();
      (listings || []).forEach((l: any) => {
        const c = (l.city as string)?.trim();
        if (c) listingCounts.set(c, (listingCounts.get(c) || 0) + 1);
      });

      const data: DemandRow[] = Array.from(searchCounts.entries())
        .map(([city, searches]) => {
          const matched = listingCounts.get(city) || 0;
          return { city, searches, matched_listings: matched, gap: searches - matched * 3 };
        })
        .filter((r) => r.searches >= 3)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 12);

      setRows(data);
      setLoading(false);
    };
    load();
  }, []);

  const maxSearches = Math.max(1, ...rows.map((r) => r.searches));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Demand Heatmap
        </CardTitle>
        <CardDescription>
          Cities with searches but limited inventory in the last 30 days. Underserved markets are flagged — list there first to win.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No demand data yet — check back after more search activity.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const pct = (r.searches / maxSearches) * 100;
              const isUnderserved = r.matched_listings < 3 && r.searches >= 5;
              return (
                <div key={r.city} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{r.city}</span>
                      {isUnderserved && (
                        <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0">
                          <AlertCircle className="h-2.5 w-2.5" />Underserved
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground tabular-nums">
                      {r.searches} searches · {r.matched_listings} listings
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isUnderserved ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
