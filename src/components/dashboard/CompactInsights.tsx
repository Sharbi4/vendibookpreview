import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Calendar, Eye, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIInsights, AIInsight } from '@/hooks/useAIInsights';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// YC-level tight microcopy for insights
const INSIGHT_COPY = {
  booking_requests: {
    title: 'Requests need a response',
    body: 'Respond now to keep bookings moving.',
    cta: 'Review Requests',
    link: '/dashboard?tab=bookings',
  },
  low_views: {
    title: 'Views are low this week',
    body: 'Update photos and titles on your listings.',
    cta: 'Optimize Listings',
    link: '/dashboard?tab=listings',
  },
  reviews: {
    title: 'Add reviews to increase trust',
    body: 'Reviews help you convert more bookings.',
    cta: 'Request Reviews',
    link: '/dashboard?tab=listings',
  },
};

export const CompactInsights = () => {
  const { insights, isLoading, error } = useAIInsights();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning':
        return <Calendar className="h-4 w-4" />;
      case 'tip':
        return <Eye className="h-4 w-4" />;
      case 'opportunity':
        return <Star className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30';
      case 'warning':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/30';
      case 'tip':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30';
      case 'opportunity':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-900/30';
    }
  };

  // Map insight to tight copy
  const getInsightCopy = (insight: AIInsight) => {
    // Match based on title keywords
    if (insight.title.toLowerCase().includes('request') || insight.title.toLowerCase().includes('booking')) {
      return INSIGHT_COPY.booking_requests;
    }
    if (insight.title.toLowerCase().includes('view') || insight.title.toLowerCase().includes('low')) {
      return INSIGHT_COPY.low_views;
    }
    if (insight.title.toLowerCase().includes('review') || insight.title.toLowerCase().includes('trust')) {
      return INSIGHT_COPY.reviews;
    }
    // Fallback to original
    return {
      title: insight.title,
      body: '',
      cta: insight.action || 'View Details',
      link: '#',
    };
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

  const renderInsight = (insight: AIInsight, index: number) => {
    const copy = getInsightCopy(insight);
    
    return (
      <div
        key={index}
        className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border"
      >
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center",
          getIconColor(insight.type)
        )}>
          {getIcon(insight.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {copy.title}
          </p>
          {copy.body && (
            <p className="text-xs text-muted-foreground mt-0.5">{copy.body}</p>
          )}
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 text-xs text-primary mt-1"
            asChild
          >
            <Link to={copy.link}>{copy.cta} →</Link>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Recommendations</h4>
          {hiddenInsights.length > 0 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
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
      </div>
    </Collapsible>
  );
};

export default CompactInsights;
