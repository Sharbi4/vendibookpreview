import React from 'react';
import { Star, TrendingUp, CheckCircle2, Eye, Zap, Crown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface FeaturedListingCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

const FEATURED_LISTING_FEE = 25;

export const FeaturedListingCard: React.FC<FeaturedListingCardProps> = ({
  enabled,
  onEnabledChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold">Featured Listing</h3>
        <Badge variant="secondary" className="ml-2 text-xs font-medium">
          Optional
        </Badge>
      </div>

      <div className={`rounded-xl border-2 p-4 transition-all ${
        enabled 
          ? 'border-amber-500 bg-amber-500/5' 
          : 'border-border bg-card hover:border-amber-500/50'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${enabled ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <Crown className={`w-5 h-5 ${enabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <Label 
                  htmlFor="featured_listing_toggle" 
                  className="text-base font-semibold cursor-pointer"
                >
                  Boost Your Visibility
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get priority placement and more views
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>Top of search results</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>Featured badge on listing</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>Homepage spotlight</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>3x more visibility</span>
              </div>
            </div>

            {/* Price tag */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-2xl font-bold text-foreground">${FEATURED_LISTING_FEE}</span>
              <span className="text-sm text-muted-foreground">one-time • 30 days</span>
            </div>

            {enabled && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Great choice!</strong> Featured listings get up to 3x more views and inquiries compared to standard listings.
                </div>
              </div>
            )}
          </div>

          <Switch
            id="featured_listing_toggle"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {/* What's included */}
        {enabled && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Zap className="w-4 h-4" />
              What you get
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" />
                <span>Priority in all search results</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span>"Featured" badge displayed</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Included in featured carousel</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>30 days of premium placement</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Featured status lasts for 30 days from purchase. Renew anytime from your dashboard.
      </p>
    </div>
  );
};
