import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { useHostAnalytics, buildTimeSeries } from '@/hooks/useHostAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const RANGES = [
  { label: '30D', days: 30 },
  { label: '60D', days: 60 },
  { label: '90D', days: 90 },
  { label: 'YTD', days: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) },
];

export const RevenueChart = () => {
  const [rangeIdx, setRangeIdx] = useState(0);
  const days = RANGES[rangeIdx].days;
  const { data, isLoading } = useHostAnalytics(days);

  const series = useMemo(() => buildTimeSeries(data || []), [data]);
  const totalRevenue = series.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Revenue</h3>
          <p className="text-xs text-muted-foreground">
            ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r, i) => (
            <Button
              key={r.label}
              variant={rangeIdx === i ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : series.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/40 rounded-lg">
          No revenue data yet
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
