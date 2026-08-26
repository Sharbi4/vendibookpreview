import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createLinkedRentalDraft, linkedRentalState } from '@/lib/listings/rentalConversion';

/**
 * Linked rental (if any) for a sale listing. Used by the dashboard CTA to
 * decide between "Rent it out", "Finish rental setup" and "Manage rental".
 */
export const useLinkedRental = (saleListingId: string | undefined, enabled = true) => {
  const query = useQuery({
    queryKey: ['linked-rental', saleListingId],
    enabled: Boolean(saleListingId) && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, status, title, price_daily, price_weekly, price_monthly')
        .eq('source_listing_id', saleListingId!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  return {
    ...query,
    rental: query.data ?? null,
    state: linkedRentalState(query.data ?? null),
  };
};

/** Idempotently creates the linked rental draft. */
export const useCreateLinkedRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saleListingId: string) => {
      const result = await createLinkedRentalDraft(saleListingId);
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onSuccess: (_data, saleListingId) => {
      queryClient.invalidateQueries({ queryKey: ['linked-rental', saleListingId] });
      queryClient.invalidateQueries({ queryKey: ['host-listings'] });
    },
  });
};
