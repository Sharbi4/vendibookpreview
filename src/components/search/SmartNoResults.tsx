import { useEffect, useState } from 'react';
import { Loader2, Banknote, Truck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackLeadEvent } from '@/lib/leadTracking';
import { supabase } from '@/integrations/supabase/client';
import ListingCard from '@/components/listing/ListingCard';
import { EmptyStateEmailCapture } from './EmptyStateEmailCapture';

interface SmartNoResultsProps {
  searchParams: Record<string, unknown>;
  onClearFilters: () => void;
  category?: string;
  mode?: string;
  locationText?: string;
  activeFiltersCount?: number;
}

interface Suggestion {
  listings: any[];
  reason: string;
}

/**
 * Smart no-results: instead of dead-ending users, auto-tries widened
 * variations of their search (bigger radius, drop category, drop mode)
 * and shows the first batch that returns results. Falls back to the
 * existing email capture form if nothing matches.
 */
const BuyerHelpCards = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <Link to="/financing" className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition-colors">
      <Banknote className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-left">
        <p className="font-semibold text-foreground text-sm">Explore financing options</p>
        <p className="text-xs text-muted-foreground mt-0.5">See if you qualify to spread the cost of a truck or trailer. Terms depend on approval.</p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2">Check financing <ArrowRight className="h-3 w-3" /></span>
      </div>
    </Link>
    <Link to="/vendibook-freight" className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition-colors">
      <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-left">
        <p className="font-semibold text-foreground text-sm">Nothing nearby? We can ship it</p>
        <p className="text-xs text-muted-foreground mt-0.5">Vendibook Freight delivers trucks and trailers nationwide, so you can buy from any state.</p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2">How freight works <ArrowRight className="h-3 w-3" /></span>
      </div>
    </Link>
  </div>
);

export const SmartNoResults = ({
  searchParams,
  onClearFilters,
  category,
  mode,
  locationText,
  activeFiltersCount}: SmartNoResultsProps) => {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSuggestion(null);

    const run = async () => {
      // Try progressively wider variations. The final step has no filters,
      // so shoppers always see real listings instead of a dead end.
      const baseRadius = (searchParams.radius_miles as number) || 25;
      const hasQuery = typeof searchParams.query === 'string' && (searchParams.query as string).trim() !== '';
      const variations: Array<{ params: Record<string, unknown>; reason: string }> = [];
      if (searchParams.lat && baseRadius < 100) {
        variations.push({ params: { ...searchParams, radius_miles: 100, page: 1 }, reason: 'Expanded to within 100 miles' });
      }
      if (hasQuery) {
        variations.push({
          params: { ...searchParams, query: undefined, radius_miles: Math.max(baseRadius, 100), page: 1 },
          reason: 'Similar listings in your area'});
      }
      if (category) {
        variations.push({
          params: { ...searchParams, query: undefined, category: undefined, radius_miles: Math.max(baseRadius, 100), page: 1 },
          reason: 'Other categories near you'});
      }
      if (mode) {
        variations.push({
          params: { ...searchParams, query: undefined, mode: undefined, page: 1 },
          reason: mode === 'rent' ? 'Available for sale instead' : 'Available for rent instead'});
      }
      if (mode || category) {
        variations.push({ params: { mode, category, page: 1 }, reason: 'Available nationwide — Vendibook Freight can deliver' });
      }
      variations.push({ params: { page: 1 }, reason: 'Popular listings on Vendibook' });

      for (const v of variations) {
        if (cancelled) return;
        try {
          const { data, error } = await supabase.functions.invoke('search-listings', {
            body: v.params});
          if (error) continue;
          const listings = (data as any)?.listings ?? [];
          if (listings.length > 0) {
            if (!cancelled) {
              setSuggestion({ listings: listings.slice(0, 6), reason: v.reason });
              trackLeadEvent('search_performed', { source: 'zero_results_fallback', reason: v.reason, result_count: listings.length } as any);
              setLoading(false);
            }
            return;
          }
        } catch {
          // ignore, try next variation
        }
      }
      if (!cancelled) setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(searchParams), category, mode]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Searching...</span>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="py-8 space-y-6">
        <BuyerHelpCards />
      <EmptyStateEmailCapture
        onClearFilters={onClearFilters}
        category={category}
        mode={mode}
        locationText={locationText}
        activeFiltersCount={activeFiltersCount}
      />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 mb-3">
          
          <span className="text-xs font-medium text-foreground">{suggestion.reason}</span>
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          No exact matches — here's what's close
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          We expanded your search to find these similar options.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestion.listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            hostVerified={listing.host_verified ?? false}
            compact
          />
        ))}
      </div>
      <BuyerHelpCards />
      <div className="pt-4 border-t border-border">
        <EmptyStateEmailCapture
          onClearFilters={onClearFilters}
          category={category}
          mode={mode}
          locationText={locationText}
          activeFiltersCount={activeFiltersCount}
        />
      </div>
    </div>
  );
};

export default SmartNoResults;
