import { DollarSign, TrendingUp, Wallet, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { cn } from '@/lib/utils';
import { RevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface RevenueAnalyticsCardProps {
  analytics: RevenueAnalytics;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);
};

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export const RevenueAnalyticsCard = ({ analytics }: RevenueAnalyticsCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 bg-emerald-500/10';
      case 'paid':
      case 'buyer_confirmed':
      case 'seller_confirmed':
        return 'text-blue-600 bg-blue-500/10';
      case 'disputed':
        return 'text-red-600 bg-red-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusLabel = (status: string, payoutCompleted: boolean) => {
    if (payoutCompleted) return 'Paid Out';
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'paid':
      case 'buyer_confirmed':
      case 'seller_confirmed':
        return 'In Escrow';
      case 'disputed':
        return 'Disputed';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Revenue Header with Stripe */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#635bff]/20 to-[#635bff]/5 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-[#635bff]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Revenue Analytics</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Powered by</span>
              <StripeLogo size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#635bff]/10 via-[#635bff]/5 to-transparent p-5 border border-[#635bff]/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#635bff]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#635bff]/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#635bff]" />
              </div>
              {analytics.revenueTrend !== 0 && (
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1",
                  analytics.revenueTrend > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                )}>
                  <TrendingUp className={cn("h-3 w-3", analytics.revenueTrend < 0 && "rotate-180")} />
                  {Math.abs(analytics.revenueTrend)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(analytics.totalEarnings)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Earnings</p>
          </div>
        </div>

        {/* Paid Out */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 border border-emerald-500/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(analytics.totalPaidOut)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Paid Out</p>
          </div>
        </div>

        {/* Pending Payout */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 border border-amber-500/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(analytics.pendingPayout)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Pending Payout</p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-5 border border-purple-500/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(analytics.averageOrderValue)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Avg Order Value</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#635bff]" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyRevenue.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlyRevenue}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#635bff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#635bff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      }}
                      formatter={(value: number) => [formatCurrencyFull(value), 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#635bff"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs Payouts Bar Chart */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#635bff]" />
              Revenue vs Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyRevenue.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyRevenue}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrencyFull(value),
                        name === 'revenue' ? 'Revenue' : 'Payouts'
                      ]}
                    />
                    <Legend 
                      formatter={(value) => value === 'revenue' ? 'Revenue' : 'Payouts'}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#635bff" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                    <Bar 
                      dataKey="payouts" 
                      fill="hsl(142 76% 36%)" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No payout data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-[#635bff]" />
              Recent Transactions
            </div>
            <StripeLogo size="sm" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.payoutHistory.length > 0 ? (
            <div className="space-y-3">
              {analytics.payoutHistory.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-muted/50 to-transparent hover:from-muted transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#635bff]/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-[#635bff]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {payout.listing_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payout.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrencyFull(payout.seller_payout)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        -{formatCurrencyFull(payout.platform_fee)} fee
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      payout.payout_completed_at 
                        ? "text-emerald-600 bg-emerald-500/10" 
                        : getStatusColor(payout.status)
                    )}>
                      {getStatusLabel(payout.status, !!payout.payout_completed_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No transactions yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
