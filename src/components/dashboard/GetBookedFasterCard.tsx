import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Camera, Calendar, DollarSign, MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { cn } from '@/lib/utils';

interface Tip {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionTo?: string;
  priority: number;
}

export const GetBookedFasterCard = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { listings } = useHostListings();
  const { stats: bookingStats } = useHostBookings();

  // Generate tips based on listing data
  const generateTips = (): Tip[] => {
    const tips: Tip[] = [];

    // Check for listings with few photos
    const needsPhotos = listings.some(l => 
      (l.image_urls?.length || 0) < 5 && l.status === 'published'
    );
    if (needsPhotos) {
      tips.push({
        id: 'photos',
        icon: Camera,
        title: 'Add more photos',
        description: 'Listings with 5+ photos get 40% more views',
        actionLabel: 'Edit listing',
        actionTo: '/dashboard?tab=listings',
        priority: 1,
      });
    }

    // Check for rentals without availability set
    const needsAvailability = listings.some(l => 
      l.mode === 'rent' && 
      l.status === 'published' && 
      !l.available_from && 
      !l.available_to
    );
    if (needsAvailability) {
      tips.push({
        id: 'availability',
        icon: Calendar,
        title: 'Set availability dates',
        description: 'Help shoppers know when your asset is free',
        actionLabel: 'Add dates',
        actionTo: '/dashboard?tab=listings',
        priority: 2,
      });
    }

    // Check for listings without instant book
    const noInstantBook = listings.some(l => 
      l.mode === 'rent' && 
      l.status === 'published' && 
      !l.instant_book
    );
    if (noInstantBook) {
      tips.push({
        id: 'instant',
        icon: Sparkles,
        title: 'Enable Instant Book',
        description: 'Get 2x more bookings with instant confirmations',
        actionLabel: 'Enable now',
        actionTo: '/dashboard?tab=listings',
        priority: 3,
      });
    }

    // Check response time
    if (bookingStats.pending > 0) {
      tips.push({
        id: 'respond',
        icon: MessageSquare,
        title: 'Respond faster',
        description: `You have ${bookingStats.pending} pending request${bookingStats.pending > 1 ? 's' : ''}`,
        actionLabel: 'View requests',
        actionTo: '/dashboard?tab=bookings',
        priority: 0,
      });
    }

    // Check for competitive pricing (placeholder - would need market data)
    const hasLowViews = listings.some(l => 
      l.status === 'published' && 
      (l.view_count || 0) < 10
    );
    if (hasLowViews && tips.length < 2) {
      tips.push({
        id: 'price',
        icon: DollarSign,
        title: 'Review your pricing',
        description: 'Use our AI tool to find the optimal price',
        actionLabel: 'Check pricing',
        actionTo: '/tools/price-pilot',
        priority: 4,
      });
    }

    return tips.sort((a, b) => a.priority - b.priority).slice(0, 2);
  };

  const tips = generateTips();

  if (tips.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 shadow-md flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Get booked faster</h3>
            <p className="text-xs text-muted-foreground">{tips.length} tip{tips.length > 1 ? 's' : ''} to improve</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="relative px-4 pb-4 space-y-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.id}
                className="flex items-start gap-3 p-3 bg-card/80 backdrop-blur-sm rounded-lg border border-border"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                </div>
                {tip.actionTo && (
                  <Button 
                    size="sm" 
                    asChild 
                    className="flex-shrink-0 h-7 text-xs bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
                  >
                    <Link to={tip.actionTo}>
                      {tip.actionLabel}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GetBookedFasterCard;
