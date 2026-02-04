import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Eye,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const HostReporting = () => {
  const { analytics, isLoading } = useRevenueAnalytics();
  const [timeRange, setTimeRange] = useState('30d');

  const chartData = analytics?.monthlyRevenue || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-7xl py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Performance Reporting</h1>
            <p className="text-muted-foreground">Track your earnings and listing performance.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard 
                title="Total Revenue" 
                value={`$${(analytics?.totalEarnings || 0).toLocaleString()}`} 
                trend={analytics?.revenueTrend ? `${analytics.revenueTrend > 0 ? '+' : ''}${analytics.revenueTrend}% from last month` : 'No data yet'}
                icon={DollarSign}
                trendUp={analytics?.revenueTrend ? analytics.revenueTrend > 0 : true}
              />
              <MetricCard 
                title="This Month" 
                value={`$${(analytics?.revenueThisMonth || 0).toLocaleString()}`} 
                trend={`$${(analytics?.revenueLastMonth || 0).toLocaleString()} last month`}
                icon={TrendingUp}
                trendUp={true}
              />
              <MetricCard 
                title="Total Transactions" 
                value={String(analytics?.totalTransactions || 0)} 
                trend="Completed sales"
                icon={Users}
                trendUp={true}
              />
              <MetricCard 
                title="Avg Order Value" 
                value={`$${(analytics?.averageOrderValue || 0).toFixed(2)}`} 
                trend="Per transaction"
                icon={Eye}
                trendUp={true}
              />
            </div>

            {/* Charts Section */}
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No revenue data yet. Complete your first sale to see analytics.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.payoutHistory && analytics.payoutHistory.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.payoutHistory.slice(0, 5).map((payout) => (
                        <div key={payout.id} className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{payout.listing_title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payout.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="font-bold text-sm">${payout.seller_payout.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No payouts yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pending Payout Summary */}
            {(analytics?.pendingPayout ?? 0) > 0 && (
              <Card className="mt-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Payout</p>
                      <p className="text-2xl font-bold">${analytics?.pendingPayout.toFixed(2)}</p>
                    </div>
                    <Button variant="outline">
                      View Payout Details
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

const MetricCard = ({ title, value, trend, icon: Icon, trendUp }: {
  title: string;
  value: string;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
  trendUp: boolean;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className={`text-xs ${trendUp ? 'text-emerald-600' : 'text-red-600'} flex items-center mt-1`}>
        {trend}
      </p>
    </CardContent>
  </Card>
);

export default HostReporting;
