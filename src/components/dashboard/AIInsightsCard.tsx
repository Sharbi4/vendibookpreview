import { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Lightbulb, Target, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AIInsight {
  type: 'success' | 'warning' | 'tip' | 'opportunity';
  title: string;
  description: string;
  action?: string;
}

interface AIInsightsCardProps {
  analytics: {
    totalViews: number;
    viewsToday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
    viewsTrend: number;
    topListings: {
      listingId: string;
      title: string;
      totalViews: number;
      viewsTrend: number;
    }[];
  } | null;
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

export const AIInsightsCard = ({ analytics, stats, bookingStats }: AIInsightsCardProps) => {
  const insights = useMemo<AIInsight[]>(() => {
    const result: AIInsight[] = [];

    // Analyze view trends
    if (analytics) {
      if (analytics.viewsTrend > 20) {
        result.push({
          type: 'success',
          title: 'Views are surging! 🚀',
          description: `Your listings are getting ${analytics.viewsTrend}% more views than last month. This is a great time to raise prices or add new listings.`,
          action: 'Consider adjusting pricing',
        });
      } else if (analytics.viewsTrend < -20) {
        result.push({
          type: 'warning',
          title: 'Views declining',
          description: `Views are down ${Math.abs(analytics.viewsTrend)}% from last month. Consider refreshing your listing photos or descriptions.`,
          action: 'Update listing content',
        });
      }

      // Top performer insight
      if (analytics.topListings.length > 0) {
        const topListing = analytics.topListings[0];
        if (topListing.totalViews > 50) {
          result.push({
            type: 'tip',
            title: 'Star performer identified',
            description: `"${topListing.title}" is your top listing with ${topListing.totalViews} views. Consider highlighting what makes it successful in other listings.`,
          });
        }
      }

      // Low views opportunity
      if (analytics.totalViews < 10 && stats.published > 0) {
        result.push({
          type: 'opportunity',
          title: 'Boost your visibility',
          description: 'Add more photos and detailed descriptions to increase your listing views. Listings with 5+ photos get 3x more bookings.',
          action: 'Enhance listings',
        });
      }
    }

    // Booking conversion analysis
    if (analytics && analytics.totalViews > 0 && bookingStats.total > 0) {
      const conversionRate = (bookingStats.total / analytics.totalViews) * 100;
      if (conversionRate > 5) {
        result.push({
          type: 'success',
          title: 'High conversion rate!',
          description: `${conversionRate.toFixed(1)}% of views convert to bookings. You're above the marketplace average of 3%.`,
        });
      } else if (conversionRate < 1 && analytics.totalViews > 50) {
        result.push({
          type: 'tip',
          title: 'Improve conversions',
          description: 'Consider adding more details about pricing, amenities, or availability to help visitors make booking decisions faster.',
        });
      }
    }

    // Pending bookings reminder
    if (bookingStats.pending > 0) {
      result.push({
        type: 'warning',
        title: `${bookingStats.pending} pending request${bookingStats.pending > 1 ? 's' : ''}`,
        description: 'Respond quickly to booking requests. Hosts who respond within 24 hours get 40% more bookings.',
        action: 'Review requests',
      });
    }

    // Draft listings reminder
    if (stats.drafts > 0) {
      result.push({
        type: 'opportunity',
        title: `${stats.drafts} draft${stats.drafts > 1 ? 's' : ''} waiting`,
        description: 'You have unpublished listings. Complete and publish them to start earning.',
        action: 'Finish drafts',
      });
    }

    // Success insight for high approval rate
    if (bookingStats.total > 5) {
      const approvalRate = (bookingStats.approved / bookingStats.total) * 100;
      if (approvalRate > 80) {
        result.push({
          type: 'success',
          title: 'Excellent approval rate',
          description: `You've approved ${approvalRate.toFixed(0)}% of bookings. Great job building trust with renters!`,
        });
      }
    }

    // If no insights, add a default one
    if (result.length === 0) {
      result.push({
        type: 'tip',
        title: 'Get started',
        description: 'Create your first listing to start receiving bookings and building your analytics dashboard.',
        action: 'Create listing',
      });
    }

    return result.slice(0, 3); // Max 3 insights
  }, [analytics, stats, bookingStats]);

  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5" />;
      case 'opportunity':
        return <Target className="h-5 w-5" />;
    }
  };

  const getStyles = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
          border: 'border-emerald-500/20',
          icon: 'text-emerald-600',
          glow: 'bg-emerald-500/20',
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
          border: 'border-amber-500/20',
          icon: 'text-amber-600',
          glow: 'bg-amber-500/20',
        };
      case 'tip':
        return {
          bg: 'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
          border: 'border-blue-500/20',
          icon: 'text-blue-600',
          glow: 'bg-blue-500/20',
        };
      case 'opportunity':
        return {
          bg: 'bg-gradient-to-br from-purple-500/10 to-purple-500/5',
          border: 'border-purple-500/20',
          icon: 'text-purple-600',
          glow: 'bg-purple-500/20',
        };
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-full blur-md opacity-50 animate-pulse" />
            <div className="relative icon-gradient-container">
              <Sparkles className="h-5 w-5 text-primary icon-gradient" />
            </div>
          </div>
          AI Insights
          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-2">
            Powered by AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const styles = getStyles(insight.type);
          return (
            <div
              key={index}
              className={cn(
                "relative overflow-hidden rounded-xl p-4 border transition-all duration-300 hover:scale-[1.01] hover:shadow-md",
                styles.bg,
                styles.border
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Glow effect */}
              <div className={cn(
                "absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-50",
                styles.glow
              )} />
              
              <div className="relative flex gap-3">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                  styles.bg,
                  styles.icon
                )}>
                  {getIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.action && (
                    <span className="inline-block mt-2 text-xs font-medium text-primary hover:underline cursor-pointer">
                      {insight.action} →
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
