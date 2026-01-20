import { DollarSign, TrendingUp, Wallet, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { cn } from '@/lib/utils';
import { RevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { format } from 'date-fns';
import { PayoutScheduleCard } from './PayoutScheduleCard';
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
  onOpenStripeDashboard?: () => void;
  isOpeningDashboard?: boolean;
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

export const RevenueAnalyticsCard = ({ analytics, onOpenStripeDashboard, isOpeningDashboard }: RevenueAnalyticsCardProps) => {
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
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <DollarSign className="h-6 w-6" />
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
        <div className="rounded-2xl bg-card p-5 border-0 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#635bff]/10 flex items-center justify-center">
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

        {/* Paid Out */}
        <div className="rounded-2xl bg-card p-5 border-0 shadow-lg hover:shadow-xl transition-all">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(analytics.totalPaidOut)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Paid Out</p>
        </div>

        {/* Pending Payout */}
        <div className="rounded-2xl bg-card p-5 border-0 shadow-lg hover:shadow-xl transition-all">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(analytics.pendingPayout)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Pending Payout</p>
        </div>

        {/* Average Order Value */}
        <div className="rounded-2xl bg-card p-5 border-0 shadow-lg hover:shadow-xl transition-all">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
            <Wallet className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(analytics.averageOrderValue)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Avg Order Value</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2 bg-muted/30 border-b border-border">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {analytics.monthlyRevenue.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlyRevenue}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm bg-muted/30 rounded-xl">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs Payouts Bar Chart */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2 bg-muted/30 border-b border-border">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
              Revenue vs Payouts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
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
                        borderRadius: '12px',
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
                      fill="hsl(var(--primary))" 
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
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm bg-muted/30 rounded-xl">
                No payout data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout Schedule */}
      <PayoutScheduleCard
        pendingPayout={analytics.pendingPayout}
        payoutHistory={analytics.payoutHistory}
        onOpenStripeDashboard={onOpenStripeDashboard}
        isOpeningDashboard={isOpeningDashboard}
      />

      {/* Payout History */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3 bg-muted/30 border-b border-border">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              Recent Transactions
            </div>
            <StripeLogo size="sm" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {analytics.payoutHistory.length > 0 ? (
            <div className="space-y-3">
              {analytics.payoutHistory.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
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
            <div className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-xl">
              No transactions yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
