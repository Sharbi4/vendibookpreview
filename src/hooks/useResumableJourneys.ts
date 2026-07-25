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
          .select('id,title,updated_at,image_urls,description,price_sale,price_daily,price_hourly,price_weekly,price_monthly')
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
            price_sale: number | null;
            price_daily: number | null;
            price_hourly: number | null;
            price_weekly: number | null;
            price_monthly: number | null;
          };
          const hasPhotos = Array.isArray(row.image_urls) && row.image_urls.length > 0;
          const hasDesc = !!row.description && row.description.length > 40;
          const hasPrice = [row.price_sale, row.price_daily, row.price_hourly, row.price_weekly, row.price_monthly]
            .some((v) => typeof v === 'number' && v > 0);
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

      // Permit Path — in-progress roadmap checklists
      try {
        const { data } = await supabase
          .from('permit_progress')
          .select('id,roadmap_key,state_code,city,business_type,completed,owned,updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(3);
        (data ?? []).forEach((r) => {
          const row = r as unknown as {
            id: string;
            roadmap_key: string | null;
            state_code: string | null;
            city: string | null;
            business_type: string | null;
            completed: Record<string, unknown> | null;
            owned: Record<string, unknown> | null;
            updated_at: string | null;
          };
          const completedCount = row.completed ? Object.values(row.completed).filter(Boolean).length : 0;
          const ownedCount = row.owned ? Object.values(row.owned).filter(Boolean).length : 0;
          const doneCount = completedCount + ownedCount;
          // Skip empty progress rows and clearly-finished ones (heuristic: 12+ items handled).
          if (doneCount === 0) return;
          if (doneCount >= 12) return;
          const location = [row.city, row.state_code].filter(Boolean).join(', ');
          const params = new URLSearchParams();
          if (row.state_code) params.set('state', row.state_code);
          if (row.city) params.set('city', row.city);
          if (row.business_type) params.set('businessType', row.business_type);
          collected.push({
            id: `permit-progress-${row.id}`,
            title: location ? `Permit checklist — ${location}` : 'Permit checklist',
            nextStep: `Continue where you left off (${doneCount} item${doneCount === 1 ? '' : 's'} handled)`,
            savedAt: friendlySavedAt(row.updated_at),
            href: `/tools/permitpath${params.toString() ? `?${params.toString()}` : ''}`,
            priority: 65,
          });
        });
      } catch { /* skip */ }

      // Permit Concierge requests awaiting user action
      try {
        const { data } = await supabase
          .from('permit_concierge_requests')
          .select('id,status,service_level,intake,updated_at')
          .eq('user_id', user.id)
          .not('status', 'in', '("completed","cancelled","refunded")')
          .order('updated_at', { ascending: false })
          .limit(3);
        (data ?? []).forEach((r) => {
          const row = r as unknown as {
            id: string;
            status: string | null;
            service_level: string | null;
            intake: Record<string, unknown> | null;
            updated_at: string | null;
          };
          const hasIntake = !!row.intake && Object.keys(row.intake).length > 0;
          const nextStep =
            !hasIntake || row.status === 'awaiting_intake'
              ? 'Complete your intake form'
              : row.status === 'in_review'
              ? 'We\'re reviewing — check status'
              : row.status === 'awaiting_documents'
              ? 'Upload required documents'
              : 'Continue permit concierge';
          collected.push({
            id: `permit-concierge-${row.id}`,
            title: row.service_level === 'white_glove'
              ? 'Permit Concierge — White Glove'
              : 'Permit Concierge',
            nextStep,
            savedAt: friendlySavedAt(row.updated_at),
            href: `/dashboard?view=host&tab=permits&concierge=${row.id}`,
            priority: 75,
          });
        });
      } catch { /* skip */ }

      // Buyer/seller "wanted" asset requests still open
      try {
        const { data } = await supabase
          .from('asset_requests')
          .select('id,title,asset_type,status,city,state,updated_at')
          .eq('user_id', user.id)
          .in('status', ['new', 'incomplete', 'awaiting_info'])
          .order('updated_at', { ascending: false })
          .limit(3);
        (data ?? []).forEach((r) => {
          const row = r as unknown as {
            id: string;
            title: string | null;
            asset_type: string | null;
            status: string | null;
            city: string | null;
            state: string | null;
            updated_at: string | null;
          };
          const label = row.title || (row.asset_type ? `${row.asset_type} wanted` : 'Asset request');
          const nextStep =
            row.status === 'incomplete' || row.status === 'awaiting_info'
              ? 'Add missing details'
              : 'View matches and next steps';
          collected.push({
            id: `asset-request-${row.id}`,
            title: label,
            nextStep,
            savedAt: friendlySavedAt(row.updated_at),
            href: `/wanted?request=${row.id}`,
            priority: 55,
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
