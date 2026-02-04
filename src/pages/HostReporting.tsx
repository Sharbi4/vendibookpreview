import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  CreditCard,
  Wallet,
  Receipt,
  Clock,
  CheckCircle2,
  Loader2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Calendar,
  Percent,
  Target,
  Repeat,
  Zap,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const HostReporting = () => {
  const { analytics, isLoading } = useRevenueAnalytics();
  const { openStripeDashboard, isOpeningDashboard } = useStripeConnect();
  const [timeRange, setTimeRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!analytics) return;
    setIsExporting(true);

    try {
      const overviewData = [
        { Metric: 'Total Lifetime Earnings', Value: analytics.totalEarnings },
        { Metric: 'Total Paid Out', Value: analytics.totalPaidOut },
        { Metric: 'Pending Payout', Value: analytics.pendingPayout },
        { Metric: 'Revenue (This Month)', Value: analytics.revenueThisMonth },
        { Metric: 'Revenue (Last Month)', Value: analytics.revenueLastMonth },
        { Metric: 'Total Transactions', Value: analytics.totalTransactions },
        { Metric: 'Average Order Value', Value: analytics.averageOrderValue },
      ];

      const monthlyData = analytics.monthlyRevenue.map(m => ({
        Month: m.month,
        Revenue: m.revenue,
        Payouts: m.payouts
      }));

      const transactionData = analytics.payoutHistory.map(p => ({
        Date: new Date(p.created_at).toLocaleDateString(),
        Listing: p.listing_title,
        Amount: p.amount,
        'Your Payout': p.seller_payout,
        'Platform Fee': p.platform_fee,
        Status: p.status,
      }));

      const wb = XLSX.utils.book_new();
      
      const wsOverview = XLSX.utils.json_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

      const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Performance');

      const wsTransactions = XLSX.utils.json_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Recent Transactions');

      XLSX.writeFile(wb, `Vendibook_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const chartData = analytics?.monthlyRevenue || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'buyer_confirmed':
      case 'seller_confirmed':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-7xl py-8">
        {/* Header with Dark Shine Design */}
        <div className="p-6 rounded-2xl bg-card border border-border mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-background" />
              </div>
              <div>
                <Link 
                  to="/dashboard?view=host"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Performance Reporting</h1>
                <p className="text-sm text-muted-foreground">Track your Stripe earnings and payouts.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px] rounded-xl border-border">
                  <SelectValue placeholder="Last 30 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 3 months</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                className="gap-2 rounded-xl border-border hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200"
                onClick={() => openStripeDashboard()}
                disabled={isOpeningDashboard}
              >
                {isOpeningDashboard ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Stripe Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="gap-2 rounded-xl border-border hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200"
                onClick={handleExport}
                disabled={isLoading || !analytics || isExporting}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF5124]" />
          </div>
        ) : (
          <>
            {/* Key Metrics - Primary Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <MetricCard 
                title="Total Earnings" 
                value={`$${(analytics?.totalEarnings || 0).toLocaleString()}`} 
                icon={DollarSign}
                highlight
              />
              <MetricCard 
                title="This Month" 
                value={`$${(analytics?.revenueThisMonth || 0).toLocaleString()}`} 
                icon={TrendingUp}
                trend={analytics?.revenueTrend}
              />
              <MetricCard 
                title="Last Month" 
                value={`$${(analytics?.revenueLastMonth || 0).toLocaleString()}`} 
                icon={Clock}
              />
              <MetricCard 
                title="Total Paid Out" 
                value={`$${(analytics?.totalPaidOut || 0).toLocaleString()}`} 
                icon={Wallet}
              />
              <MetricCard 
                title="Pending Payout" 
                value={`$${(analytics?.pendingPayout || 0).toLocaleString()}`} 
                icon={Receipt}
                highlight={(analytics?.pendingPayout ?? 0) > 0}
              />
              <MetricCard 
                title="Avg Order Value" 
                value={`$${(analytics?.averageOrderValue || 0).toFixed(0)}`} 
                subtitle={`${analytics?.totalTransactions || 0} orders`}
                icon={CreditCard}
              />
            </div>

            {/* Secondary Metrics - Insights Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard 
                title="Total Transactions" 
                value={analytics?.totalTransactions || 0} 
                subtitle="Completed bookings"
                icon={Calendar}
              />
              <MetricCard 
                title="Platform Fees" 
                value={`$${((analytics?.totalEarnings || 0) * 0.10).toFixed(0)}`} 
                subtitle="~10% service fee"
                icon={Percent}
              />
              <MetricCard 
                title="Net Earnings" 
                value={`$${((analytics?.totalEarnings || 0) * 0.90).toFixed(0)}`} 
                subtitle="After fees"
                icon={Target}
              />
              <MetricCard 
                title="Payout Rate" 
                value={`${analytics?.totalEarnings ? ((analytics?.totalPaidOut / analytics.totalEarnings) * 100).toFixed(0) : 0}%`} 
                subtitle="Earnings paid out"
                icon={Zap}
              />
            </div>

            {/* Revenue Trend Card - Dark Shine */}
            {analytics?.revenueTrend !== undefined && analytics.revenueTrend !== 0 && (
              <div className="p-4 rounded-2xl border border-border bg-card mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${analytics.revenueTrend > 0 ? 'bg-foreground' : 'bg-red-600'}`}>
                    {analytics.revenueTrend > 0 ? (
                      <ArrowUpRight className="h-5 w-5 text-background" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">
                      {analytics.revenueTrend > 0 ? '+' : ''}{analytics.revenueTrend}% vs last month
                    </span>
                    <p className="text-sm text-muted-foreground">
                      ${analytics.revenueThisMonth.toLocaleString()} this month vs ${analytics.revenueLastMonth.toLocaleString()} last month
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <Card className="lg:col-span-2 rounded-2xl border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-background" />
                    </div>
                    Revenue & Payouts
                  </CardTitle>
                  <CardDescription>Monthly breakdown of earnings and payouts</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barGap={4}>
                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `$${value.toFixed(2)}`, 
                            name === 'revenue' ? 'Earnings' : 'Paid Out'
                          ]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Legend 
                          formatter={(value) => value === 'revenue' ? 'Earnings' : 'Paid Out'}
                        />
                        <Bar dataKey="revenue" fill="#FF5124" radius={[4, 4, 0, 0]} name="revenue" />
                        <Bar dataKey="payouts" fill="#10b981" radius={[4, 4, 0, 0]} name="payouts" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
                      <p>No revenue data yet</p>
                      <p className="text-sm">Complete your first sale to see analytics</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-background" />
                    </div>
                    Transaction History
                  </CardTitle>
                  <CardDescription>Recent sales and payouts</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[320px] overflow-y-auto">
                  {analytics?.payoutHistory && analytics.payoutHistory.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.payoutHistory.map((payout) => (
                        <div key={payout.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            payout.payout_completed_at ? 'bg-foreground' : 'bg-foreground/70'
                          }`}>
                            {payout.payout_completed_at ? (
                              <CheckCircle2 className="h-4 w-4 text-background" />
                            ) : (
                              <Clock className="h-4 w-4 text-background" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{payout.listing_title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {new Date(payout.created_at).toLocaleDateString()}
                              </span>
                              {getStatusBadge(payout.status)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">${payout.seller_payout.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              Fee: ${payout.platform_fee.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No transactions yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pending Payout Summary - Dark Shine */}
            {(analytics?.pendingPayout ?? 0) > 0 && (
              <Card className="rounded-2xl border-foreground/30 bg-foreground/5">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-background" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ready for Payout</p>
                        <p className="text-3xl font-bold">${analytics?.pendingPayout.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button 
                      className="bg-foreground text-background hover:bg-foreground/90 rounded-xl"
                      onClick={() => openStripeDashboard()}
                      disabled={isOpeningDashboard}
                    >
                      {isOpeningDashboard ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      View in Stripe
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

const MetricCard = ({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  highlight
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  highlight?: boolean;
}) => (
  <Card className={`rounded-2xl border-border hover:border-foreground/30 transition-all duration-200 shadow-sm ${
    highlight ? 'border-foreground/50 bg-foreground/5' : ''
  }`}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center">
          <Icon className="h-4 w-4 text-background" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      <div className="text-xl font-bold">{value}</div>
      {trend !== undefined && trend !== 0 && (
        <p className={`text-xs flex items-center gap-1 mt-1 ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend > 0 ? '+' : ''}{trend}%
        </p>
      )}
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

export default HostReporting;
