import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { effectiveOfferStatus } from '@/lib/offers/offerState';

/**
 * Real buyer activity on the seller's OWN sale listings, for the BuyerMatch dashboard.
 * Every query is scoped to the signed-in seller (host_id / seller_id) and still runs
 * under RLS. A metric that fails to load is `null` ("not available"), never 0.
 */
export interface ListingSignals {
  /** listing_views rows in the last 30 days. */
  views30: number | null;
  /** Buyers who saved the listing (get_listing_favorite_count). */
  saves: number | null;
  /** Offers still waiting on the seller's answer (pending and not expired). */
  offersWaiting: number | null;
  /** Highest offer amount waiting on the seller, if any. */
  topOffer: number | null;
  /** Buyer conversations started on this listing. */
  conversations: number | null;
}

export const SIGNAL_WINDOW_DAYS = 30;
/** Bound the per-listing requests; sale sellers rarely have more live listings than this. */
const MAX_LISTINGS = 24;

export async function fetchListingSignals(sellerId: string, listingIds: string[]): Promise<Record<string, ListingSignals>> {
  const ids = listingIds.slice(0, MAX_LISTINGS);
  const out: Record<string, ListingSignals> = {};
  if (!ids.length) return out;
  const since = new Date(Date.now() - SIGNAL_WINDOW_DAYS * 864e5).toISOString();

  const [views, saves, offers, conversations] = await Promise.all([
    Promise.all(ids.map(async id => {
      const { count, error } = await supabase.from('listing_views').select('id', { count: 'exact', head: true }).eq('listing_id', id).gte('viewed_at', since);
      return error || typeof count !== 'number' ? null : count;
    })),
    Promise.all(ids.map(async id => {
      const { data, error } = await supabase.rpc('get_listing_favorite_count', { listing_uuid: id });
      return error || typeof data !== 'number' ? null : data;
    })),
    supabase.from('offers').select('listing_id,status,offer_amount,created_at,expires_at,responded_at,counter_expires_at').eq('seller_id', sellerId).in('listing_id', ids)
      .then(({ data, error }) => (error ? null : data ?? [])),
    supabase.from('conversations').select('listing_id').eq('host_id', sellerId).in('listing_id', ids)
      .then(({ data, error }) => (error ? null : data ?? [])),
  ]);

  const now = Date.now();
  ids.forEach((id, i) => {
    const waiting = offers?.filter(o => o.listing_id === id && effectiveOfferStatus(o, now) === 'pending') ?? null;
    out[id] = {
      views30: views[i],
      saves: saves[i],
      offersWaiting: waiting ? waiting.length : null,
      topOffer: waiting?.length ? Math.max(...waiting.map(o => Number(o.offer_amount) || 0)) : null,
      conversations: conversations ? conversations.filter(c => c.listing_id === id).length : null,
    };
  });
  return out;
}

export function useBuyerMatchSignals(listingIds: string[]) {
  const { user } = useAuth();
  const key = [...listingIds].sort().join(',');
  return useQuery({
    queryKey: ['buyermatch-signals', user?.id, key],
    enabled: !!user && listingIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => fetchListingSignals(user!.id, listingIds),
  });
}
