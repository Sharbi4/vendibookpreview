import { Sparkles, TrendingUp, Lightbulb, Target, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIInsights, AIInsight } from '@/hooks/useAIInsights';
import { formatDistanceToNow } from 'date-fns';

export const AIInsightsCard = () => {
  const { insights, dataSnapshot, isLoading, error, refresh, lastUpdated } = useAIInsights();

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
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          icon: 'text-emerald-600',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          icon: 'text-amber-600',
        };
      case 'tip':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          icon: 'text-blue-600',
        };
      case 'opportunity':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
          icon: 'text-purple-600',
        };
    }
  };

  return (
    <Card className="border border-border shadow-md overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            AI Insights
            <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-2">
              Powered by AI
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refresh}
              disabled={isLoading}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        {/* Data Snapshot Pills */}
        {dataSnapshot && (
          <div className="flex flex-wrap gap-2 mt-3">
            {dataSnapshot.totalEarnings > 0 && (
              <div className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/20">
                💰 ${dataSnapshot.totalEarnings.toLocaleString()} earned
              </div>
            )}
            {dataSnapshot.totalViews > 0 && (
              <div className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/20">
                👁 {dataSnapshot.totalViews.toLocaleString()} views
              </div>
            )}
            {dataSnapshot.avgRating > 0 && (
              <div className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/20">
                ⭐ {dataSnapshot.avgRating.toFixed(1)} rating
              </div>
            )}
            {dataSnapshot.stripeBalance > 0 && (
              <div className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/20">
                💳 ${dataSnapshot.stripeBalance.toFixed(2)} available
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your data with AI...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 bg-muted/30 rounded-xl">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh} className="rounded-xl">
              Try Again
            </Button>
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 bg-muted/30 rounded-xl">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              No insights available yet. Create listings to start receiving AI-powered recommendations.
            </p>
          </div>
        ) : (
          insights.map((insight, index) => {
            const styles = getStyles(insight.type);
            return (
              <div
                key={index}
                className={cn(
                  "rounded-xl p-4 border transition-all duration-300 hover:shadow-md animate-fade-in",
                  styles.bg,
                  styles.border
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex gap-3">
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
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
          })
        )}
      </CardContent>
    </Card>
  );
};
