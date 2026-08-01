import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemandPoint {
  city: string;
  lat: number;
  lng: number;
  searches: number;
  listings: number;
  intensity: number; // 0..1
  underserved: boolean;
}

interface DemandHeatmapLayerProps {
  /** Toggle visibility of the layer overlay UI */
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** Map ref to overlay heat circles on (Google Maps instance) */
  mapInstance?: google.maps.Map | null;
}

/**
 * Renders a demand-heatmap legend + opportunity zone callouts.
 * Uses Google Maps native circles (added directly to the map instance) when available.
 * Falls back to a side panel if no map instance is provided.
 */
export const DemandHeatmapLayer = ({ enabled, onToggle, mapInstance }: DemandHeatmapLayerProps) => {
  const [points, setPoints] = useState<DemandPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: events }, { data: listings }] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('city')
          .gte('created_at', since)
          .not('city', 'is', null)
          .limit(5000),
        supabase
          .from('listings')
          .select('city, latitude, longitude')
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .not('city', 'is', null)
          .not('latitude', 'is', null)
          .limit(5000),
      ]);

      if (cancelled) return;
      const searches = new Map<string, number>();
      (events || []).forEach((e: any) => {
        const c = (e.city as string)?.trim();
        if (!c) return;
        searches.set(c, (searches.get(c) || 0) + 1);
      });

      const listingByCity = new Map<string, { count: number; lat: number; lng: number }>();
      (listings || []).forEach((l: any) => {
        const c = (l.city as string)?.trim();
        if (!c || !l.latitude || !l.longitude) return;
        const prev = listingByCity.get(c);
        if (prev) {
          prev.count += 1;
          prev.lat = (prev.lat + l.latitude) / 2;
          prev.lng = (prev.lng + l.longitude) / 2;
        } else {
          listingByCity.set(c, { count: 1, lat: l.latitude, lng: l.longitude });
        }
      });

      const maxSearches = Math.max(1, ...Array.from(searches.values()));
      const data: DemandPoint[] = [];
      searches.forEach((count, city) => {
        const lc = listingByCity.get(city);
        if (!lc) return; // skip cities we can't place
        data.push({
          city,
          lat: lc.lat,
          lng: lc.lng,
          searches: count,
          listings: lc.count,
          intensity: count / maxSearches,
          underserved: count >= 5 && lc.count < 3,
        });
      });
      data.sort((a, b) => b.searches - a.searches);
      setPoints(data.slice(0, 25));
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [enabled]);

  // Draw / clear circles on Google Map
  useEffect(() => {
    if (!mapInstance || !enabled) return;
    const circles: google.maps.Circle[] = [];
    points.forEach((p) => {
      const radius = 8000 + p.intensity * 30000;
      const color = p.underserved ? '#ef4444' : p.intensity > 0.6 ? '#f97316' : '#fbbf24';
      const c = new google.maps.Circle({
        center: { lat: p.lat, lng: p.lng },
        radius,
        strokeColor: color,
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: 0.18 + p.intensity * 0.25,
        map: mapInstance,
        clickable: false,
      });
      circles.push(c);
    });
    return () => { circles.forEach((c) => c.setMap(null)); };
  }, [mapInstance, points, enabled]);

  const topUnderserved = useMemo(() => points.filter((p) => p.underserved).slice(0, 4), [points]);

  return (
    <>
      {/* Toggle pill (always visible) */}
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className={cn(
          "absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-lg backdrop-blur-md transition-all",
          enabled
            ? "bg-orange-500 text-white border-orange-600 hover:bg-orange-600"
            : "bg-background/95 text-foreground border-border hover:bg-muted"
        )}
        aria-pressed={enabled}
      >
        <Flame className={cn("h-3.5 w-3.5", enabled && "animate-pulse")} />
        Demand heatmap
      </button>

      {/* Legend + opportunity zones panel */}
      {enabled && (
        <div className="absolute top-14 right-3 z-30 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-background/95 backdrop-blur-md border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-semibold text-foreground">Opportunity zones</span>
            </div>
            <button onClick={() => onToggle(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" />Active</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" />Hot</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" />Underserved</div>
            </div>

            {loading ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Loading demand data…</p>
            ) : topUnderserved.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">No underserved markets right now.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide font-semibold">Top underserved markets</p>
                {topUnderserved.map((p) => (
                  <div key={p.city} className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">{p.city}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {p.searches} searches · {p.listings} listings
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground italic pt-1">
              Cities with high search volume + low inventory. List there first to capture demand.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
