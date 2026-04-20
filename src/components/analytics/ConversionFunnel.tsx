import { TrendingUp, TrendingDown, Eye, MessageSquare, ShoppingCart, DollarSign } from 'lucide-react';
import { useMemo } from 'react';
import { useHostAnalytics, aggregateAnalytics } from '@/hooks/useHostAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface ConversionFunnelProps {
  days?: number;
}

/**
 * Views → Inquiries → Bookings → Revenue funnel with drop-off %.
 * Amazon/Shopify-style commerce funnel visualization.
 */
export const ConversionFunnel = ({ days = 30 }: ConversionFunnelProps) => {
  const { data, isLoading } = useHostAnalytics(days);

  const totals = useMemo(() => aggregateAnalytics(data || []), [data]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const stages = [
    {
      label: 'Views',
      value: totals.views,
      icon: Eye,
      color: 'bg-sky-500/20 border-sky-500/40',
      barColor: 'bg-sky-500',
    },
    {
      label: 'Inquiries',
      value: totals.inquiries,
      icon: MessageSquare,
      color: 'bg-amber-500/20 border-amber-500/40',
      barColor: 'bg-amber-500',
    },
    {
      label: 'Bookings',
      value: totals.bookings,
      icon: ShoppingCart,
      color: 'bg-emerald-500/20 border-emerald-500/40',
      barColor: 'bg-emerald-500',
    },
    {
      label: 'Revenue',
      value: totals.revenue,
      icon: DollarSign,
      color: 'bg-primary/20 border-primary/40',
      barColor: 'bg-primary',
      isCurrency: true,
    },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Conversion Funnel</h3>
          <p className="text-xs text-muted-foreground">Last {days} days</p>
        </div>
        <div className="text-right text-xs">
          <div className="text-muted-foreground">View → Inquiry</div>
          <div className="font-semibold text-foreground">
            {totals.conversionInquiry.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          const pct = (stage.value / max) * 100;
          const dropoff =
            i > 0 && stages[i - 1].value > 0
              ? ((stages[i - 1].value - stage.value) / stages[i - 1].value) * 100
              : null;
          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md border ${stage.color}`}>
                    <Icon className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{stage.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {dropoff !== null && dropoff > 0 && (
                    <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                      <TrendingDown className="h-3 w-3 text-rose-400" />
                      {dropoff.toFixed(0)}% drop
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {stage.isCurrency ? `$${stage.value.toLocaleString()}` : stage.value.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`h-full ${stage.barColor} transition-all duration-500 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {totals.views === 0 && (
        <p className="mt-4 text-xs text-muted-foreground text-center py-4 border border-dashed border-border/40 rounded-lg">
          No traffic yet. Once shoppers start viewing your listings, your funnel will appear here.
        </p>
      )}
    </div>
  );
};

export default ConversionFunnel;
