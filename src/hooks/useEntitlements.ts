import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Entitlement = {
  productSlug: string;
  productName: string;
  kind: 'subscription' | 'one_time';
  source: 'host_subscription' | 'monetization_purchase';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paid' | 'fulfilled' | 'refunded' | 'failed' | 'pending';
  listingId?: string | null;
  since?: string | null;
  endsAt?: string | null;
};

export type EntitlementMap = {
  bySlug: Record<string, Entitlement>;
  byListing: Record<string, Entitlement[]>;
  all: Entitlement[];
  hasActiveSubscription: boolean;
  activeSubscriptionSlug?: string;
};

const EMPTY: EntitlementMap = { bySlug: {}, byListing: {}, all: [], hasActiveSubscription: false };

export function useEntitlements() {
  const { user } = useAuth();
  const [data, setData] = useState<EntitlementMap>(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setData(EMPTY); return; }
    setLoading(true);
    try {
      const [subsRes, purchasesRes] = await Promise.all([
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
      ]);

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

      const bySlug: Record<string, Entitlement> = {};
      const byListing: Record<string, Entitlement[]> = {};
      for (const e of all) {
        // Prefer active/completed over refunded/cancelled
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
  const rank = (s: Entitlement['status']) =>
    s === 'active' ? 5 : s === 'trialing' ? 4 : s === 'fulfilled' ? 3 : s === 'paid' ? 2 : s === 'past_due' ? 1 : 0;
  return rank(a.status) > rank(b.status);
}
