import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays } from 'date-fns';

/**
 * Checks if the current user has had ALL required document types approved
 * in any booking within the past 365 days. If so, they can bypass re-upload.
 *
 * Returns:
 *  - docsOnFile: true if every required type was approved within 365 days
 *  - onFileDocTypes: the set of doc types that are on file
 *  - approvedAt: the most recent approval timestamp (for display)
 *  - expiresAt: 365 days from the most recent approval
 *  - isLoading
 */
export function useDocumentsOnFile(requiredDocTypes: string[] | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['documents-on-file', user?.id, requiredDocTypes],
    queryFn: async () => {
      if (!user?.id || !requiredDocTypes || requiredDocTypes.length === 0) {
        return { docsOnFile: false, onFileDocTypes: [] as string[], approvedAt: null, expiresAt: null };
      }

      const cutoff = subDays(new Date(), 365).toISOString();

      // Find all approved documents for this user's bookings within the past 365 days
      // We join through booking_requests to find bookings where this user is the shopper
      const { data: approvedDocs, error } = await supabase
        .from('booking_documents')
        .select(`
          document_type,
          reviewed_at,
          status,
          booking_id,
          booking_requests!inner(shopper_id)
        `)
        .eq('status', 'approved')
        .eq('booking_requests.shopper_id', user.id)
        .gte('reviewed_at', cutoff)
        .order('reviewed_at', { ascending: false });

      if (error) {
        console.error('Error checking documents on file:', error);
        return { docsOnFile: false, onFileDocTypes: [] as string[], approvedAt: null, expiresAt: null };
      }

      if (!approvedDocs || approvedDocs.length === 0) {
        return { docsOnFile: false, onFileDocTypes: [] as string[], approvedAt: null, expiresAt: null };
      }

      // Get unique approved doc types
      const approvedTypes = new Set(approvedDocs.map(d => d.document_type as string));
      const onFileDocTypes = requiredDocTypes.filter(t => approvedTypes.has(t));

      // Check if ALL required types are on file
      const docsOnFile = requiredDocTypes.every(t => approvedTypes.has(t));

      // Most recent approval date
      const latestApproval = approvedDocs[0]?.reviewed_at || null;
      const expiresAt = latestApproval
        ? new Date(new Date(latestApproval).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      return {
        docsOnFile,
        onFileDocTypes,
        approvedAt: latestApproval,
        expiresAt,
      };
    },
    enabled: !!user?.id && !!requiredDocTypes && requiredDocTypes.length > 0,
  });
}
