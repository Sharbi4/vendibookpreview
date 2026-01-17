import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, TrendingUp, AlertCircle, Lightbulb, Target, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIInsights, AIInsight } from '@/hooks/useAIInsights';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const CompactInsights = () => {
  const { insights, isLoading, error } = useAIInsights();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-blue-600" />;
      case 'opportunity':
        return <Target className="h-4 w-4 text-purple-600" />;
    }
  };

  const getBgColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-900/20';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20';
      case 'tip':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'opportunity':
        return 'bg-purple-50 dark:bg-purple-900/20';
    }
  };

  // Don't render if loading or no insights
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || insights.length === 0) {
    return null;
  }

  // Show first 2 insights, rest collapsed
  const visibleInsights = insights.slice(0, 2);
  const hiddenInsights = insights.slice(2);

  const renderInsight = (insight: AIInsight, index: number) => (
    <div
      key={index}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg",
        getBgColor(insight.type)
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon(insight.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">
          {insight.title}
        </p>
        {insight.action && (
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 text-xs text-primary mt-1"
            asChild
          >
            <Link to="#">{insight.action} →</Link>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Recommendations</h4>
            {hiddenInsights.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  {isOpen ? 'Show less' : `+${hiddenInsights.length} more`}
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Always visible insights */}
          <div className="space-y-2">
            {visibleInsights.map((insight, index) => renderInsight(insight, index))}
          </div>

          {/* Collapsible additional insights */}
          <CollapsibleContent className="space-y-2">
            {hiddenInsights.map((insight, index) => renderInsight(insight, index + 2))}
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
};

export default CompactInsights;
