import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Compares the user's listing prices against city/category medians.
 */
export const CompetitorPricingCard = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['competitor-pricing', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: mine } = await supabase
        .from('listings')
        .select('id, title, category, mode, city, price_daily, price_weekly, price_sale')
        .eq('host_id', user.id)
        .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear');

      if (!mine || mine.length === 0) return [];

      const result: Array<{
        id: string;
        title: string;
        my_price: number;
        market_median: number;
        delta_pct: number;
        recommendation: 'underpriced' | 'fair' | 'overpriced';
        price_field: string;
      }> = [];

      for (const m of mine) {
        const priceField =
          m.mode === 'sale' ? 'price_sale' : m.price_daily ? 'price_daily' : 'price_weekly';
        const myPrice = (m as any)[priceField];
        if (!myPrice) continue;

        const { data: comps } = await supabase
          .from('listings')
          .select(priceField)
          .eq('category', m.category)
          .eq('city', m.city || '')
          .eq('mode', m.mode)
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .neq('id', m.id)
          .limit(50);

        const prices = (comps || [])
          .map((c: any) => Number(c[priceField]))
          .filter((p) => p > 0)
          .sort((a, b) => a - b);
        if (prices.length < 2) continue;

        const median = prices[Math.floor(prices.length / 2)];
        const delta = ((myPrice - median) / median) * 100;
        let rec: 'underpriced' | 'fair' | 'overpriced' = 'fair';
        if (delta < -15) rec = 'underpriced';
        else if (delta > 15) rec = 'overpriced';

        result.push({
          id: m.id,
          title: m.title,
          my_price: myPrice,
          market_median: median,
          delta_pct: delta,
          recommendation: rec,
          price_field: priceField,
        });
      }
      return result;
    },
    enabled: !!user,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Competitor Pricing</h3>
          <p className="text-xs text-muted-foreground">Vs. category + city medians</p>
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/40 rounded-lg text-center px-4">
          Not enough comparable listings nearby to benchmark yet.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((row) => {
            const Icon =
              row.recommendation === 'underpriced'
                ? TrendingUp
                : row.recommendation === 'overpriced'
                ? TrendingDown
                : Minus;
            const tone =
              row.recommendation === 'underpriced'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : row.recommendation === 'overpriced'
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                : 'text-foreground/70 bg-muted/30 border-border/40';
            return (
              <div key={row.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-background/40 border border-border/40">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{row.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Yours ${row.my_price.toLocaleString()} · Market ${row.market_median.toLocaleString()}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${tone}`}>
                  <Icon className="h-3 w-3" />
                  {row.delta_pct > 0 ? '+' : ''}{row.delta_pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompetitorPricingCard;
