import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HandoffMode = 'sale' | 'rental';
export type HandoffFulfillment = 'pickup' | 'delivery' | 'freight' | 'on_site';

export type HandoffContext = {
  mode: HandoffMode;
  fulfillment: HandoffFulfillment;
  /** true when derived from a real, authorized order/booking */
  real: boolean;
  currentStage?: string;
  listingId?: string | null;
  orderRoute?: string | null;
  paid?: boolean;
  agreementReady?: boolean;
  agreementSigned?: boolean;
  freightIncluded?: boolean | null;
  freightPaid?: boolean | null;
};

const SALE_FULFILLMENT: Record<string, HandoffFulfillment> = {
  pickup: 'pickup',
  local_pickup: 'pickup',
  equipment_pickup: 'pickup',
  delivery: 'delivery',
  local_delivery: 'delivery',
  equipment_delivery: 'delivery',
  seller_delivery: 'delivery',
  freight: 'freight',
  shipping: 'freight',
};

const RENTAL_FULFILLMENT: Record<string, HandoffFulfillment> = {
  pickup: 'pickup',
  rental_pickup: 'pickup',
  delivery: 'delivery',
  rental_delivery: 'delivery',
  host_delivery: 'delivery',
  on_site: 'on_site',
  onsite: 'on_site',
};

const ON_SITE_CATEGORIES = new Set(['ghost_kitchen', 'vendor_lot', 'vendor_space']);

export const parsePublicFulfillment = (value: string | null): HandoffFulfillment | null => {
  if (!value) return null;
  const key = value.toLowerCase();
  return SALE_FULFILLMENT[key] ?? RENTAL_FULFILLMENT[key] ?? null;
};

export const parsePublicMode = (value: string | null): HandoffMode | null =>
  value === 'sale' || value === 'rental' ? value : null;

type Args = { transactionId?: string | null; bookingId?: string | null };

/**
 * Loads handoff context for the guide. All reads go through RLS-scoped tables,
 * so an unauthorized id simply resolves to null and no private data is exposed.
 */
export function useHandoffContext({ transactionId, bookingId }: Args) {
  return useQuery<HandoffContext | null>({
    queryKey: ['handoff-context', transactionId ?? null, bookingId ?? null],
    enabled: Boolean(transactionId || bookingId),
    staleTime: 60_000,
    queryFn: async () => {
      if (transactionId) {
        const { data } = await supabase
          .from('sale_transactions')
          .select('id, listing_id, status, fulfillment_type, freight_cost, freight_payment_status, shipping_status')
          .eq('id', transactionId)
          .maybeSingle();
        if (!data) return null;

        const { data: docs } = await supabase
          .from('documents')
          .select('id, status, signed_pdf_path')
          .eq('transaction_id', transactionId);

        const agreementReady = Boolean(docs && docs.length > 0);
        const agreementSigned = Boolean(
          docs?.some((d: any) => d.signed_pdf_path || ['signed', 'completed', 'approved'].includes(String(d.status ?? ''))),
        );
        const fulfillment = SALE_FULFILLMENT[String(data.fulfillment_type ?? '').toLowerCase()] ?? 'pickup';
        const paid = !['pending', 'payment_failed', 'cancelled', 'draft'].includes(String(data.status ?? ''));

        return {
          mode: 'sale',
          fulfillment,
          real: true,
          listingId: data.listing_id,
          paid,
          agreementReady,
          agreementSigned,
          freightIncluded: fulfillment === 'freight' ? Number(data.freight_cost ?? 0) === 0 : null,
          freightPaid: fulfillment === 'freight' ? String(data.freight_payment_status ?? '') === 'paid' : null,
          currentStage: !paid
            ? 'pay'
            : agreementReady && !agreementSigned
              ? 'sign'
              : fulfillment === 'pickup'
                ? 'plan'
                : fulfillment === 'freight'
                  ? 'freight-coordination'
                  : 'prepare-delivery',
        } satisfies HandoffContext;
      }

      if (bookingId) {
        const { data } = await supabase
          .from('booking_requests')
          .select('id, listing_id, status, payment_status, fulfillment_selected, listings(category)')
          .eq('id', bookingId)
          .maybeSingle();
        if (!data) return null;

        const { data: docs } = await supabase
          .from('documents')
          .select('id, status, signed_pdf_path, renter_signed_at, host_signed_at')
          .eq('booking_id', bookingId);

        const agreementReady = Boolean(docs && docs.length > 0);
        const agreementSigned = Boolean(
          docs?.some((d: any) => (d.renter_signed_at && d.host_signed_at) || d.signed_pdf_path),
        );
        const category = String((data as any).listings?.category ?? '');
        const selected = String(data.fulfillment_selected ?? '').toLowerCase();
        const fulfillment: HandoffFulfillment = ON_SITE_CATEGORIES.has(category)
          ? 'on_site'
          : RENTAL_FULFILLMENT[selected] ?? 'pickup';
        const paid = String(data.payment_status ?? '') === 'paid';

        return {
          mode: 'rental',
          fulfillment,
          real: true,
          listingId: data.listing_id,
          paid,
          agreementReady,
          agreementSigned,
          currentStage: !paid
            ? 'pay'
            : agreementReady && !agreementSigned
              ? 'sign'
              : fulfillment === 'on_site'
                ? 'access'
                : fulfillment === 'delivery'
                  ? 'prepare-delivery'
                  : 'plan',
        } satisfies HandoffContext;
      }

      return null;
    },
  });
}
