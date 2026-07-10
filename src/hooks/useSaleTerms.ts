/**
 * useSaleTerms — resolve the immutable transaction_terms snapshot that a
 * sale_transactions row agreed to at checkout.
 *
 * Primary lookup: `transaction_terms.id = sale.terms_id` (the direct
 * backlink written by create-cash-sale / create-checkout).
 * Fallback: `transaction_terms.sale_transaction_id = sale.id` — for
 * legacy rows created before `sale_transactions.terms_id` existed.
 *
 * Anything that displays "what buyer and seller agreed to" (dispute
 * cards, refund modals, admin resolution UI) MUST go through this hook
 * so both branches always resolve the SAME snapshot.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgreedTermsRow {
  id: string;
  sale_transaction_id: string | null;
  terms_version: string | null;
  transaction_mode: string | null;
  payment_method: string | null;
  subtotal_cents: number | null;
  deposit_cents: number | null;
  commission_cents: number | null;
  renter_fee_cents: number | null;
  total_cents: number | null;
  acknowledged_at: string | null;
  snapshot: Record<string, any> | null;
  resolvedVia: 'terms_id' | 'sale_transaction_id';
}

const SELECT =
  'id,sale_transaction_id,terms_version,transaction_mode,payment_method,' +
  'subtotal_cents,deposit_cents,commission_cents,renter_fee_cents,total_cents,' +
  'acknowledged_at,snapshot';

export function useSaleTerms(
  saleId: string | null | undefined,
  termsId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['sale-terms', saleId, termsId],
    enabled: Boolean(saleId),
    queryFn: async (): Promise<AgreedTermsRow | null> => {
      // Primary path — direct link via terms_id.
      if (termsId) {
        const { data, error } = await (supabase
          .from('transaction_terms' as any)
          .select(SELECT)
          .eq('id', termsId)
          .maybeSingle()) as any;
        if (!error && data) {
          return { ...(data as any), resolvedVia: 'terms_id' } as AgreedTermsRow;
        }
      }
      // Fallback for legacy sales.
      if (!saleId) return null;
      const { data, error } = await (supabase
        .from('transaction_terms' as any)
        .select(SELECT)
        .eq('sale_transaction_id', saleId)
        .maybeSingle()) as any;
      if (error || !data) return null;
      return { ...(data as any), resolvedVia: 'sale_transaction_id' } as AgreedTermsRow;
    },
    staleTime: 5 * 60 * 1000, // snapshot is immutable; cache generously
  });
}
