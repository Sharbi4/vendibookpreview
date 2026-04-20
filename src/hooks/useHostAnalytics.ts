import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DailyAnalyticsRow {
  date: string;
  views: number;
  unique_viewers: number;
  inquiries: number;
  bookings: number;
  revenue: number;
  source_breakdown: Record<string, number>;
  listing_id: string;
}

/**
 * Triggers a fresh rollup then returns the cached daily series.
 */
export function useHostAnalytics(days: number = 30) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const rollup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics-rollup', {
        body: { days },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['host-analytics'] });
    },
  });

  const query = useQuery({
    queryKey: ['host-analytics', user?.id, days],
    queryFn: async () => {
      if (!user) return [] as DailyAnalyticsRow[];
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data } = await supabase
        .from('listing_analytics_daily')
        .select('*')
        .eq('host_id', user.id)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });
      return ((data || []) as any) as DailyAnalyticsRow[];
    },
    enabled: !!user,
  });

  return { ...query, rollup };
}

export function aggregateAnalytics(rows: DailyAnalyticsRow[]) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.views += r.views;
      acc.inquiries += r.inquiries;
      acc.bookings += r.bookings;
      acc.revenue += Number(r.revenue || 0);
      for (const [src, n] of Object.entries(r.source_breakdown || {})) {
        acc.sources[src] = (acc.sources[src] || 0) + n;
      }
      return acc;
    },
    { views: 0, inquiries: 0, bookings: 0, revenue: 0, sources: {} as Record<string, number> }
  );

  const conversionInquiry = totals.views > 0 ? (totals.inquiries / totals.views) * 100 : 0;
  const conversionBooking = totals.inquiries > 0 ? (totals.bookings / totals.inquiries) * 100 : 0;

  return {
    ...totals,
    conversionInquiry,
    conversionBooking,
    avgRevenuePerBooking: totals.bookings > 0 ? totals.revenue / totals.bookings : 0,
  };
}

export function buildTimeSeries(rows: DailyAnalyticsRow[]) {
  // group by date
  const map = new Map<string, { date: string; views: number; inquiries: number; bookings: number; revenue: number }>();
  for (const r of rows) {
    const e = map.get(r.date) || { date: r.date, views: 0, inquiries: 0, bookings: 0, revenue: 0 };
    e.views += r.views;
    e.inquiries += r.inquiries;
    e.bookings += r.bookings;
    e.revenue += Number(r.revenue || 0);
    map.set(r.date, e);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
