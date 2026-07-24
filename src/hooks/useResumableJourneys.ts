import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { friendlySavedAt } from '@/lib/journey/copy';
import type { ResumeItem } from '@/components/journey';

/**
 * Aggregates the user's in-progress workflows into `ResumeItem`s for the
 * dashboard "Continue setup" surface. Safe if a table doesn't return rows.
 */
export function useResumableJourneys() {
  const { user } = useAuth();
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      const collected: ResumeItem[] = [];

      // Draft listings
      try {
        const { data } = await supabase
          .from('listings')
          .select('id,title,updated_at,image_urls,description,price_cents')
          .eq('host_id', user.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(3);
        (data ?? []).forEach((l) => {
          const row = l as unknown as {
            id: string;
            title: string | null;
            updated_at: string | null;
            image_urls: string[] | null;
            description: string | null;
            price_cents: number | null;
          };
          const hasPhotos = Array.isArray(row.image_urls) && row.image_urls.length > 0;
          const hasDesc = !!row.description && row.description.length > 40;
          const hasPrice = !!row.price_cents && row.price_cents > 0;
          const done = [hasPhotos, hasDesc, hasPrice].filter(Boolean).length;
          const nextStep = !hasPhotos
            ? 'Add photos'
            : !hasPrice
            ? 'Set your price'
            : !hasDesc
            ? 'Describe your listing'
            : 'Review and publish';
          collected.push({
            id: `draft-${row.id}`,
            title: row.title || 'Untitled listing',
            nextStep,
            savedAt: friendlySavedAt(row.updated_at),
            href: `/list?draft=${row.id}`,
            priority: 90,
            progress: Math.round((done / 3) * 100),
          });
        });
      } catch { /* safe to skip if schema differs */ }

      // Pending monetization purchases (abandoned checkouts / awaiting webhook)
      try {
        const { data } = await supabase
          .from('monetization_purchases')
          .select('id,status,created_at,product_id,listing_id,monetization_products(name,slug)')
          .eq('user_id', user.id)
          .in('status', ['pending'])
          .order('created_at', { ascending: false })
          .limit(3);
        (data ?? []).forEach((p: {
          id: string;
          created_at: string;
          listing_id: string | null;
          monetization_products?: { name?: string | null; slug?: string | null } | null;
        }) => {
          const name = p.monetization_products?.name ?? 'Your upgrade';
          const slug = p.monetization_products?.slug ?? '';
          const listingQs = p.listing_id ? `&listing=${p.listing_id}` : '';
          collected.push({
            id: `purchase-${p.id}`,
            title: name,
            nextStep: 'Finish checkout',
            savedAt: friendlySavedAt(p.created_at),
            href: `/dashboard?purchase=cancelled&product=${slug}${listingQs}`,
            priority: 70,
          });
        });
      } catch { /* skip if table absent */ }

      // Protected sale in progress (as buyer or seller)
      try {
        const { data } = await supabase
          .from('protected_sales')
          .select('id,status,updated_at,listing_id,buyer_id,seller_id')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .not('status', 'in', '("completed","cancelled","refunded")')
          .order('updated_at', { ascending: false })
          .limit(3);
        (data ?? []).forEach((s: {
          id: string;
          status: string;
          updated_at: string;
        }) => {
          collected.push({
            id: `protected-${s.id}`,
            title: 'Protected sale in progress',
            nextStep:
              s.status === 'awaiting_deposit'
                ? 'Complete deposit'
                : s.status === 'awaiting_signature'
                ? 'Sign the agreement'
                : s.status === 'awaiting_handoff'
                ? 'Confirm handoff'
                : 'Continue transaction',
            savedAt: friendlySavedAt(s.updated_at),
            href: `/sale/${s.id}/protection`,
            priority: 80,
          });
        });
      } catch { /* skip */ }

      // Buyer service requests (financing/inspection/etc)
      try {
        const { data } = await supabase
          .from('buyer_service_requests')
          .select('id,product_key,status,created_at,listing_id')
          .eq('buyer_id', user.id)
          .in('status', ['awaiting_payment', 'incomplete'])
          .order('created_at', { ascending: false })
          .limit(3);
        (data ?? []).forEach((r: {
          id: string;
          product_key: string;
          created_at: string;
          listing_id: string | null;
        }) => {
          const labels: Record<string, string> = {
            listing_purchase_review: 'Listing Purchase Review',
            inspection_request: 'Inspection request',
            financing_request: 'Financing request',
            transportation_request: 'Transportation request',
          };
          collected.push({
            id: `service-${r.id}`,
            title: labels[r.product_key] ?? 'Service request',
            nextStep: 'Finish and submit',
            savedAt: friendlySavedAt(r.created_at),
            href: r.listing_id
              ? `/buyer/services/review/${r.listing_id}`
              : '/buyer/services',
            priority: 60,
          });
        });
      } catch { /* skip */ }

      if (!cancelled) {
        setItems(collected);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { items, isLoading };
}

export default useResumableJourneys;
