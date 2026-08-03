import React from 'react';
import { Star, TrendingUp, CheckCircle2, Eye, Zap, Crown, MapPin, BarChart3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface FeaturedListingCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export const FEATURED_LISTING_FEE = 30;

export const FeaturedListingCard: React.FC<FeaturedListingCardProps> = ({
  enabled,
  onEnabledChange}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        enabled
          ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/[0.08] via-background to-background shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_8px_40px_-12px_rgba(251,191,36,0.45)]'
          : 'border-border bg-card hover:border-amber-400/40'
      }`}
    >
      {/* Decorative glow */}
      {enabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl"
        />
      )}

      <div className="relative p-5 sm:p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl transition-colors ${
                enabled ? 'bg-amber-500/20' : 'bg-muted'
              }`}
            >
              <Crown
                className={`w-5 h-5 ${enabled ? 'text-amber-500' : 'text-muted-foreground'}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="featured_listing_toggle"
                  className="text-base font-semibold cursor-pointer"
                >
                  Feature this listing
                </Label>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-medium uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0"
                >
                  Recommended
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Premium placement for 30 days · up to 3× more views
              </p>
            </div>
          </div>

          <Switch
            id="featured_listing_toggle"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {/* Price */}
        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">${FEATURED_LISTING_FEE}</span>
          <span className="text-sm text-muted-foreground">one-time · 30 days · no auto-renew</span>
        </div>

        {/* Benefits grid */}
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <Benefit
            icon={<Star className="w-4 h-4 text-amber-500" />}
            title="Top of search & homepage"
            desc="Pinned above standard listings everywhere shoppers browse."
          />
          <Benefit
            icon={<Star className="w-4 h-4 text-amber-500" />}
            title="Featured badge & glow"
            desc="Standout card styling that catches the eye instantly."
          />
          <Benefit
            icon={<MapPin className="w-4 h-4 text-amber-500" />}
            title="Priority on category & map"
            desc="Boosted in category pages and pinned on the search map."
          />
          <Benefit
            icon={<BarChart3 className="w-4 h-4 text-amber-500" />}
            title="Weekly boost report"
            desc="See exactly how many extra views and inquiries you got."
          />
        </div>

        {/* Confirmation banner when enabled */}
        {enabled && (
          <div className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Great choice.</strong> You'll be redirected to secure checkout after you tap{' '}
              <span className="font-semibold">Publish</span>. Your listing goes live the moment payment clears.
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Secure PayPal checkout · Cancel or skip anytime before publishing.
        </p>
      </div>
    </div>
  );
};

const Benefit: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({
  icon,
  title,
  desc}) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-0.5 shrink-0">{icon}</div>
    <div>
      <div className="text-sm font-medium text-foreground leading-tight">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</div>
    </div>
  </div>
);
