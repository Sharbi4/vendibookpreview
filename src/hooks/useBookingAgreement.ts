import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { deriveAgreementState, type AgreementRow, type AgreementState } from '@/lib/documents/agreementStatus';

/**
 * Reads the rental agreement (or bill of sale) row for a booking / transaction.
 * RLS restricts rows to the parties + admins, so a missing row simply reads as
 * "not created yet" — SignNow being unconfigured never breaks the UI.
 */
export function useBookingAgreement(
  scope: { bookingId?: string | null; transactionId?: string | null },
  documentType: 'rental_agreement' | 'bill_of_sale' = 'rental_agreement',
): { document: AgreementRow | null; state: AgreementState; isLoading: boolean } {
  const { user } = useAuth();
  const key = scope.bookingId ?? scope.transactionId ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['agreement-document', documentType, key],
    enabled: !!key,
    queryFn: async () => {
      let q = supabase
        .from('documents')
        .select('id,status,signers,signed_pdf_path,agreement_version,renter_signed_at,host_signed_at')
        .eq('document_type', documentType)
        .limit(1);
      q = scope.bookingId ? q.eq('booking_id', scope.bookingId) : q.eq('transaction_id', scope.transactionId!);
      const { data, error } = await q.maybeSingle();
      if (error) return null;
      return (data ?? null) as unknown as AgreementRow | null;
    },
  });

  return {
    document: data ?? null,
    state: deriveAgreementState(data ?? null, user?.id),
    isLoading,
  };
}
