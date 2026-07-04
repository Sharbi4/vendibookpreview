import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
      // Try variations in order of specificity preserved
      const baseRadius = (searchParams.radius_miles as number) || 25;
      const variations: Array<{ params: Record<string, unknown>; reason: string }> = [];

      // 1. Widen radius if location-based and not already at max
      if (searchParams.lat && baseRadius < 100) {
        variations.push({
          params: { ...searchParams, radius_miles: 100, page: 1 },
          reason: `Expanded to within 100 miles`});
      }
      // 2. Drop category but keep location
      if (category) {
        variations.push({
          params: { ...searchParams, category: undefined, radius_miles: Math.max(baseRadius, 50), page: 1 },
          reason: `Other categories near you`});
      }
      // 3. Drop mode (rent vs sale)
      if (mode) {
        variations.push({
          params: { ...searchParams, mode: undefined, page: 1 },
          reason: mode === 'rent' ? 'Available for sale instead' : 'Available for rent instead'});
      }
      // 4. Drop everything except mode/category — show top fresh listings
      variations.push({
        params: { mode, category, page: 1, radius_miles: 250 },
        reason: 'Popular listings you might like'});

      for (const v of variations) {
        if (cancelled) return;
        try {
          const { data, error } = await supabase.functions.invoke('search-listings', {
            body: v.params});
          if (error) continue;
          const listings = (data as any)?.listings ?? [];
          if (listings.length > 0) {
            if (!cancelled) {
              setSuggestion({ listings: listings.slice(0, 3), reason: v.reason });
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
      <EmptyStateEmailCapture
        onClearFilters={onClearFilters}
        category={category}
        mode={mode}
        locationText={locationText}
        activeFiltersCount={activeFiltersCount}
      />
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
      <div className="pt-4 border-t border-border">
        <EmptyStateEmailCapture
          onClearFilters={onClearFilters}
          category={category}
          mode={mode}
          locationText={locationText}
        />
      </div>
    </div>
  );
};

export default SmartNoResults;
