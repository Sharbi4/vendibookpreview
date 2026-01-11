import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { DocumentStatus } from '@/types/documents';

interface ReviewDocumentParams {
  documentId: string;
  bookingId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export function useReviewBookingDocument() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, bookingId, status, rejectionReason }: ReviewDocumentParams) => {
      if (!user) throw new Error('Must be logged in to review documents');

      const { data, error } = await supabase
        .from('booking_documents')
        .update({
          status: status as DocumentStatus,
          rejection_reason: status === 'rejected' ? rejectionReason || null : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', variables.bookingId] });
      toast({
        title: variables.status === 'approved' ? 'Document approved' : 'Document rejected',
        description: variables.status === 'approved' 
          ? 'The document has been verified.' 
          : 'The renter has been notified to upload a new document.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to review document',
        variant: 'destructive',
      });
    },
  });
}

// Batch approve all pending documents
export function useBatchApproveDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, documentIds }: { bookingId: string; documentIds: string[] }) => {
      if (!user) throw new Error('Must be logged in to review documents');

      const { data, error } = await supabase
        .from('booking_documents')
        .update({
          status: 'approved' as DocumentStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .in('id', documentIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', variables.bookingId] });
      toast({
        title: 'All documents approved',
        description: `${data?.length || 0} document(s) have been verified.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve documents',
        variant: 'destructive',
      });
    },
  });
}
