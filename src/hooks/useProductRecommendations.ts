import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHostEntitlements } from './useHostEntitlements';

export type RecommendationContext =
  | 'listing_published'    // just published a listing
  | 'listing_low_traffic'  // published but few views
  | 'listing_no_bookings'  // views but no bookings
  | 'seller_onboarding'    // new seller
  | 'pre_publish'          // in wizard, before publish
  | 'dashboard_home';      // generic dashboard nudge

interface Options {
  context: RecommendationContext;
  listingId?: string;
  listingType?: 'rent' | 'sale' | string;
  limit?: number;
}

// Slugs prioritized per context. First slug = primary CTA.
const CONTEXT_MAP: Record<RecommendationContext, string[]> = {
  listing_published: [
    'featured-listing-30',
    'boost-top-of-search',
    'boost-highlight',
    'listing_rewrite',
  ],
  listing_low_traffic: [
    'boost-top-of-search',
    'boost-featured-7',
    'listing_rewrite',
    'boost-social-feature',
  ],
  listing_no_bookings: [
    'pricing_review',
    'listing_rewrite',
    'boost-motivated-seller',
  ],
  seller_onboarding: [
    'seller_plus_monthly',
    'listing_rewrite',
    'buyer_readiness_pass',
  ],
  pre_publish: [
    'listing_rewrite',
    'pricing_review',
    'featured-listing-30',
  ],
  dashboard_home: [
    'vendibook_pro',
    'seller_plus_monthly',
    'boost-email-campaign',
  ],
};

export function useProductRecommendations({
  context,
  listingType,
  limit = 3,
}: Options) {
  const entitlements = useHostEntitlements();
  const slugs = CONTEXT_MAP[context] ?? [];

  return useQuery({
    queryKey: ['product-recommendations', context, listingType, entitlements.tier, limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!slugs.length) return [];
      const { data, error } = await supabase
        .from('monetization_products')
        .select('id, slug, name, description, price_cents, currency, category, billing_type, features, member_discount_pct, applicable_listing_types')
        .in('slug', slugs)
        .eq('is_active', true);
      if (error) throw error;

      const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
      return slugs
        .map((s) => bySlug.get(s))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .filter((p) => {
          // Filter by applicable listing type when provided
          const applicable = (p.applicable_listing_types ?? []) as string[];
          if (listingType && applicable.length > 0 && !applicable.includes(listingType)) {
            return false;
          }
          // Hide subscription upsells if user already has an active subscription
          if (p.category === 'host_subscription' && entitlements.isActive) return false;
          return true;
        })
        .slice(0, limit);
    },
  });
}
