import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { formatUsd, type MonetizationProduct } from '@/lib/monetization/products';

export interface HostSubscriptionRow {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  subscriptions: HostSubscriptionRow[];
  products: MonetizationProduct[];
}

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addMonths(d: Date, n: number) {
  const c = new Date(d);
  c.setUTCMonth(c.getUTCMonth() + n);
  return c;
}

export function SubscriptionRevenueSection({ subscriptions, products }: Props) {
  const priceByStripeId = useMemo(() => {
    const map = new Map<string, MonetizationProduct>();
    for (const p of products) if (p.stripe_price_id) map.set(p.stripe_price_id, p);
    return map;
  }, [products]);

  const priceCentsFor = (row: HostSubscriptionRow) => {
    if (row.stripe_price_id && priceByStripeId.has(row.stripe_price_id)) {
      return priceByStripeId.get(row.stripe_price_id)!.price_cents;
    }
    // fallback: match by tier slug on product
    const byTier = products.find(
      (p) => p.billing_type === 'recurring' && (p.slug === row.tier || p.name.toLowerCase().includes(row.tier.toLowerCase())),
    );
    return byTier?.price_cents ?? 0;
  };

  const { mrrSeries, churnSeries, tierBreakdown, kpis } = useMemo(() => {
    const now = new Date();
    const start = addMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -11);

    const months: Date[] = [];
    for (let i = 0; i < 12; i++) months.push(addMonths(start, i));

    // Active per month + gross MRR per month
    const mrrRows = months.map((m) => {
      const monthStart = m;
      const monthEnd = addMonths(m, 1);
      const active = subscriptions.filter((s) => {
        const created = new Date(s.created_at);
        if (created >= monthEnd) return false;
        // ended before month start?
        const cancelled = s.status === 'canceled' || s.status === 'cancelled';
        const endBoundary = s.cancel_at
          ? new Date(s.cancel_at)
          : s.current_period_end
          ? new Date(s.current_period_end)
          : null;
        if (cancelled && endBoundary && endBoundary < monthStart) return false;
        if (!cancelled && !ACTIVE_STATUSES.has(s.status)) return false;
        return true;
      });
      const mrr = active.reduce((sum, s) => sum + priceCentsFor(s), 0);
      return {
        month: monthKey(m),
        mrr: mrr / 100,
        active: active.length,
      };
    });

    // Churn: cancellations per month / active at start of month
    const churnRows = months.map((m) => {
      const monthStart = m;
      const monthEnd = addMonths(m, 1);
      const activeAtStart = subscriptions.filter((s) => {
        const created = new Date(s.created_at);
        if (created >= monthStart) return false;
        const endBoundary = s.cancel_at ? new Date(s.cancel_at) : null;
        if (endBoundary && endBoundary < monthStart) return false;
        return true;
      }).length;
      const cancelled = subscriptions.filter((s) => {
        if (s.status !== 'canceled' && s.status !== 'cancelled') return false;
        const end = s.cancel_at ? new Date(s.cancel_at) : new Date(s.updated_at);
        return end >= monthStart && end < monthEnd;
      }).length;
      const rate = activeAtStart > 0 ? (cancelled / activeAtStart) * 100 : 0;
      return {
        month: monthKey(m),
        cancelled,
        churnPct: Number(rate.toFixed(2)),
      };
    });

    // Current tier breakdown
    const activeNow = subscriptions.filter((s) => ACTIVE_STATUSES.has(s.status));
    const tierMap = new Map<string, { tier: string; count: number; mrr: number }>();
    for (const s of activeNow) {
      const t = s.tier || 'unknown';
      const rec = tierMap.get(t) ?? { tier: t, count: 0, mrr: 0 };
      rec.count += 1;
      rec.mrr += priceCentsFor(s) / 100;
      tierMap.set(t, rec);
    }
    const tierBreakdown = Array.from(tierMap.values()).sort((a, b) => b.mrr - a.mrr);

    const currentMrr = mrrRows[mrrRows.length - 1]?.mrr ?? 0;
    const priorMrr = mrrRows[mrrRows.length - 2]?.mrr ?? 0;
    const mrrDelta = priorMrr > 0 ? ((currentMrr - priorMrr) / priorMrr) * 100 : 0;
    const trailingChurn =
      churnRows.slice(-3).reduce((s, r) => s + r.churnPct, 0) / Math.max(1, Math.min(3, churnRows.length));

    return {
      mrrSeries: mrrRows,
      churnSeries: churnRows,
      tierBreakdown,
      kpis: {
        currentMrr,
        mrrDelta,
        activeCount: activeNow.length,
        trailingChurn,
      },
    };
  }, [subscriptions, priceByStripeId, products]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MiniKpi label="MRR (current)" value={formatUsd(Math.round(kpis.currentMrr * 100))} />
        <MiniKpi
          label="MRR change vs prior mo."
          value={`${kpis.mrrDelta >= 0 ? '+' : ''}${kpis.mrrDelta.toFixed(1)}%`}
          tone={kpis.mrrDelta >= 0 ? 'positive' : 'negative'}
        />
        <MiniKpi label="Active subscribers" value={String(kpis.activeCount)} />
        <MiniKpi
          label="Trailing 3-mo churn"
          value={`${kpis.trailingChurn.toFixed(1)}%`}
          tone={kpis.trailingChurn > 5 ? 'negative' : 'positive'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR — trailing 12 months</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" fill="url(#mrrFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Churn — cancellations & rate</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churnSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="cancelled" name="Cancellations" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="churnPct" name="Churn %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active subscribers by tier</CardTitle>
        </CardHeader>
        <CardContent>
          {tierBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscriptions yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Tier</th>
                    <th className="px-3 py-2 text-right">Subscribers</th>
                    <th className="px-3 py-2 text-right">MRR contribution</th>
                    <th className="px-3 py-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {tierBreakdown.map((t) => {
                    const totalMrr = tierBreakdown.reduce((s, r) => s + r.mrr, 0) || 1;
                    const share = (t.mrr / totalMrr) * 100;
                    return (
                      <tr key={t.tier} className="border-t border-border">
                        <td className="px-3 py-2">
                          <Badge variant="outline">{t.tier}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">{t.count}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {formatUsd(Math.round(t.mrr * 100))}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div
          className={`mt-1 text-2xl font-semibold ${
            tone === 'negative'
              ? 'text-destructive'
              : tone === 'positive'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-foreground'
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
