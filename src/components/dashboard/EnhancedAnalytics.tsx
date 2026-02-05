import { useMemo } from 'react';
import { Eye, DollarSign, Users, Target, TrendingUp, Calendar, ArrowUpRight, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface EnhancedAnalyticsProps {
  analytics: {
    totalViews: number;
    viewsToday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
    viewsTrend: number;
    dailyViews: { date: string; views: number }[];
    topListings: {
      listingId: string;
      title: string;
      totalViews: number;
      viewsTrend: number;
    }[];
  };
  stats: {
    total: number;
    published: number;
    drafts: number;
    rentals: number;
    sales: number;
  };
  bookingStats: {
    total: number;
    pending: number;
    approved: number;
    declined: number;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(45 93% 47%)', 'hsl(0 84% 60%)'];

export const EnhancedAnalytics = ({ analytics, stats, bookingStats }: EnhancedAnalyticsProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const conversionRate = useMemo(() => {
    if (analytics.totalViews === 0) return 0;
    return ((bookingStats.total / analytics.totalViews) * 100).toFixed(1);
  }, [analytics.totalViews, bookingStats.total]);

  const bookingPieData = useMemo(() => [
    { name: 'Approved', value: bookingStats.approved, color: 'hsl(142 76% 36%)' },
    { name: 'Pending', value: bookingStats.pending, color: 'hsl(45 93% 47%)' },
    { name: 'Declined', value: bookingStats.declined, color: 'hsl(0 84% 60%)' },
  ].filter(d => d.value > 0), [bookingStats]);

  const listingTypeData = useMemo(() => [
    { name: 'Rentals', value: stats.rentals, color: 'hsl(var(--primary))' },
    { name: 'For Sale', value: stats.sales, color: 'hsl(280 65% 60%)' },
  ].filter(d => d.value > 0), [stats]);

  // Weekly data aggregation
  const weeklyData = useMemo(() => {
    const weeks: { week: string; views: number }[] = [];
    const dailyViews = analytics.dailyViews;
    
    for (let i = 0; i < dailyViews.length; i += 7) {
      const weekViews = dailyViews.slice(i, i + 7);
      const totalViews = weekViews.reduce((sum, d) => sum + d.views, 0);
      const startDate = new Date(weekViews[0]?.date || '');
      weeks.push({
        week: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        views: totalViews,
      });
    }
    return weeks;
  }, [analytics.dailyViews]);

  return (
    <div className="space-y-6">
      {/* Main Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Views */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 border border-primary/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              {analytics.viewsTrend !== 0 && (
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1",
                  analytics.viewsTrend > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                )}>
                  <TrendingUp className={cn("h-3 w-3", analytics.viewsTrend < 0 && "rotate-180")} />
                  {Math.abs(analytics.viewsTrend)}%
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={analytics.totalViews} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Views</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 border border-emerald-500/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
              <Percent className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">{conversionRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">Conversion Rate</p>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-5 border border-blue-500/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={bookingStats.total} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Bookings</p>
          </div>
        </div>

        {/* Active Listings */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-5 border border-purple-500/20 group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={stats.published} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Active Listings</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Views Over Time Chart */}
        <Card className="lg:col-span-2 border border-border shadow-md bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Views Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyViews}>
                  <defs>
                    <linearGradient id="viewsGradientEnhanced" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    }}
                    labelFormatter={formatDate}
                    formatter={(value: number) => [`${value} views`, 'Views']}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#viewsGradientEnhanced)"
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Booking Status Pie Chart */}
        <Card className="border border-border shadow-md bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Booking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingPieData.length > 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={bookingPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {bookingPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {bookingPieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }} 
                      />
                      <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No booking data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Listings & Weekly Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Listings */}
        <Card className="border border-border shadow-md bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Top Performing Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topListings.length > 0 ? (
              <div className="space-y-3">
                {analytics.topListings.slice(0, 5).map((listing, index) => (
                  <div
                    key={listing.listingId}
                    className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-muted/50 to-transparent hover:from-muted transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-110",
                        index === 0 && "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-500/30",
                        index === 1 && "bg-gradient-to-br from-gray-300 to-gray-500 text-white",
                        index === 2 && "bg-gradient-to-br from-amber-500 to-amber-700 text-white",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[180px]">
                        {listing.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        <AnimatedCounter value={listing.totalViews} duration={800} />
                      </span>
                      {listing.viewsTrend !== 0 && (
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          listing.viewsTrend > 0 
                            ? "bg-emerald-500/10 text-emerald-600" 
                            : "bg-red-500/10 text-red-600"
                        )}>
                          {listing.viewsTrend > 0 ? '+' : ''}{listing.viewsTrend}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No listing data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Performance Bar Chart */}
        <Card className="border border-border shadow-md bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Weekly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} views`, 'Weekly Views']}
                  />
                  <Bar 
                    dataKey="views" 
                    fill="url(#barGradient)" 
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
