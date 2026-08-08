import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BoostHistoryRow {
  id: string;
  listingId: string;
  listingTitle: string;
  promoType: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  /** true when active and inside the window */
  live: boolean;
  daysRemaining: number;
  amountCents: number | null;
  currency: string;
  paymentStatus: string | null;
  refundedAt: string | null;
  paidAt: string | null;
}

interface PromotionRow {
  id: string;
  listing_id: string;
  promo_type: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  purchase_id: string;
  listings?: { title: string | null } | null;
  monetization_purchases?: {
    amount_cents: number | null;
    currency: string | null;
    status: string | null;
    paid_at: string | null;
    refunded_at: string | null;
  } | null;
}

const DAY = 86_400_000;

/** Boost (listing promotion) history for the signed-in host, newest first. */
export const useBoostHistory = (userId?: string) => {
  const query = useQuery({
    queryKey: ['boost-history', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<BoostHistoryRow[]> => {
      const { data, error } = await supabase
        .from('listing_promotions')
        .select(
          'id, listing_id, promo_type, starts_at, ends_at, active, purchase_id, listings!inner(title, host_id), monetization_purchases(amount_cents, currency, status, paid_at, refunded_at)',
        )
        .eq('listings.host_id', userId!)
        .order('starts_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const now = Date.now();
      return ((data ?? []) as unknown as PromotionRow[]).map((p) => {
        const end = new Date(p.ends_at).getTime();
        const start = new Date(p.starts_at).getTime();
        const live = p.active && start <= now && end > now;
        return {
          id: p.id,
          listingId: p.listing_id,
          listingTitle: p.listings?.title ?? 'Listing',
          promoType: p.promo_type,
          startsAt: p.starts_at,
          endsAt: p.ends_at,
          active: p.active,
          live,
          daysRemaining: Math.max(0, Math.ceil((end - now) / DAY)),
          amountCents: p.monetization_purchases?.amount_cents ?? null,
          currency: (p.monetization_purchases?.currency ?? 'usd').toUpperCase(),
          paymentStatus: p.monetization_purchases?.status ?? null,
          refundedAt: p.monetization_purchases?.refunded_at ?? null,
          paidAt: p.monetization_purchases?.paid_at ?? null,
        };
      });
    },
  });

  return {
    boosts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
};

export default useBoostHistory;
