import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Entitlement = {
  productSlug: string;
  productName: string;
  kind: 'subscription' | 'one_time' | 'promotion';
  source: 'host_subscription' | 'monetization_purchase' | 'listing_promotion';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paid' | 'fulfilled' | 'refunded' | 'failed' | 'pending';
  listingId?: string | null;
  since?: string | null;
  endsAt?: string | null;
  /** For time-boxed promotions: the promo_type placement unlocked. */
  promoType?: string | null;
};

export type EntitlementMap = {
  bySlug: Record<string, Entitlement>;
  byListing: Record<string, Entitlement[]>;
  all: Entitlement[];
  hasActiveSubscription: boolean;
  activeSubscriptionSlug?: string;
  /** Active, unexpired listing_promotions rows (already filtered by ends_at > now). */
  activePromotions: Entitlement[];
};

const EMPTY: EntitlementMap = {
  bySlug: {},
  byListing: {},
  all: [],
  hasActiveSubscription: false,
  activePromotions: [],
};

export function useEntitlements() {
  const { user } = useAuth();
  const [data, setData] = useState<EntitlementMap>(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setData(EMPTY); return; }
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const [subsRes, purchasesRes, listingsRes] = await Promise.all([
        supabase
          .from('host_subscriptions')
          .select('id,status,tier,current_period_end,created_at')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due']),
        supabase
          .from('monetization_purchases')
          .select('id,status,created_at,listing_id,product_id,monetization_products(slug,name,kind)')
          .eq('user_id', user.id)
          .in('status', ['paid', 'fulfilled', 'refunded']),
        supabase
          .from('listings')
          .select('id')
          .eq('host_id', user.id),
      ]);

      const ownedListingIds = ((listingsRes.data ?? []) as Array<{ id: string }>).map((l) => l.id).filter(Boolean);
      let promosRes: { data: any[] | null } = { data: [] };
      if (ownedListingIds.length > 0) {
        promosRes = await supabase
          .from('listing_promotions')
          .select('id,listing_id,product_id,promo_type,starts_at,ends_at,active,monetization_products(slug,name)')
          .in('listing_id', ownedListingIds)
          .eq('active', true)
          .gt('ends_at', nowIso);
      }

      const all: Entitlement[] = [];
      (subsRes.data ?? []).forEach((s: any) => {
        all.push({
          productSlug: s.tier ?? 'host_subscription',
          productName: s.tier ? `Host ${s.tier}` : 'Host subscription',
          kind: 'subscription',
          source: 'host_subscription',
          status: s.status,
          since: s.created_at,
          endsAt: s.current_period_end,
        });
      });
      (purchasesRes.data ?? []).forEach((p: any) => {
        const prod = p.monetization_products;
        if (!prod?.slug) return;
        all.push({
          productSlug: prod.slug,
          productName: prod.name ?? prod.slug,
          kind: prod.kind === 'subscription' ? 'subscription' : 'one_time',
          source: 'monetization_purchase',
          status: p.status,
          listingId: p.listing_id,
          since: p.created_at,
        });
      });
      const activePromotions: Entitlement[] = [];
      (promosRes.data ?? []).forEach((pr: any) => {
        const prod = pr.monetization_products;
        const ent: Entitlement = {
          productSlug: prod?.slug ?? pr.promo_type ?? 'promotion',
          productName: prod?.name ?? `Promotion — ${String(pr.promo_type ?? '').replace(/_/g, ' ')}`,
          kind: 'promotion',
          source: 'listing_promotion',
          status: 'active',
          listingId: pr.listing_id,
          since: pr.starts_at,
          endsAt: pr.ends_at,
          promoType: pr.promo_type ?? null,
        };
        all.push(ent);
        activePromotions.push(ent);
      });

      const bySlug: Record<string, Entitlement> = {};
      const byListing: Record<string, Entitlement[]> = {};
      for (const e of all) {
        const existing = bySlug[e.productSlug];
        if (!existing || isBetter(e, existing)) bySlug[e.productSlug] = e;
        if (e.listingId) {
          (byListing[e.listingId] ||= []).push(e);
        }
      }

      const activeSub = all.find(e => e.kind === 'subscription' && (e.status === 'active' || e.status === 'trialing'));
      setData({
        bySlug,
        byListing,
        all,
        hasActiveSubscription: Boolean(activeSub),
        activeSubscriptionSlug: activeSub?.productSlug,
        activePromotions,
      });
    } catch (err) {
      console.error('[useEntitlements] load failed', err);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { ...data, loading, refresh: load };
}

function isBetter(a: Entitlement, b: Entitlement) {
  const rank = (e: Entitlement) =>
    e.status === 'active' ? 5 :
    e.status === 'trialing' ? 4 :
    e.status === 'fulfilled' ? 3 :
    e.status === 'paid' ? 2 :
    e.status === 'past_due' ? 1 : 0;
  return rank(a) > rank(b);
}
