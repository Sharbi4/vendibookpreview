import { Eye, TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsCardProps {
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
}

export const AnalyticsCard = ({ analytics }: AnalyticsCardProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="icon-gradient-container">
            <BarChart3 className="h-5 w-5 text-primary icon-gradient" />
          </div>
          Analytics Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Eye className="h-4 w-4" />
                Total Views
              </div>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={analytics.totalViews} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 border border-green-500/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calendar className="h-4 w-4" />
                Today
              </div>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={analytics.viewsToday} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 border border-blue-500/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calendar className="h-4 w-4" />
                This Week
              </div>
              <div className="text-2xl font-bold text-foreground">
                <AnimatedCounter value={analytics.viewsThisWeek} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4 border border-purple-500/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                {analytics.viewsTrend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                30-Day Trend
              </div>
              <div className={cn(
                "text-2xl font-bold",
                analytics.viewsTrend >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {analytics.viewsTrend >= 0 ? '+' : ''}{analytics.viewsTrend}%
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        {analytics.dailyViews.length > 0 && (
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyViews}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  labelFormatter={formatDate}
                  formatter={(value: number) => [`${value} views`, 'Views']}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#viewsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Listings */}
        {analytics.topListings.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Top Performing Listings</h4>
            <div className="space-y-2">
              {analytics.topListings.slice(0, 3).map((listing, index) => (
                <div
                  key={listing.listingId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 && "bg-yellow-500/20 text-yellow-600",
                      index === 1 && "bg-gray-400/20 text-gray-600",
                      index === 2 && "bg-amber-600/20 text-amber-700"
                    )}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {listing.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      <AnimatedCounter value={listing.totalViews} duration={800} /> views
                    </span>
                    {listing.viewsTrend !== 0 && (
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        listing.viewsTrend > 0 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-red-500/10 text-red-600"
                      )}>
                        {listing.viewsTrend > 0 ? '+' : ''}{listing.viewsTrend}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
