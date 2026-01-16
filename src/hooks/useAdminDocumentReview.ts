import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { DocumentType, DocumentStatus } from '@/types/documents';

export interface AdminBookingDocument {
  id: string;
  booking_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  status: DocumentStatus;
  rejection_reason: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // Joined data
  booking?: {
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    shopper_id: string;
    listing_id: string;
    listing?: {
      id: string;
      title: string;
    };
    shopper?: {
      id: string;
      full_name: string | null;
      email: string | null;
    };
  };
}

// Fetch all pending documents for admin review
export function useAdminPendingDocuments() {
  return useQuery({
    queryKey: ['admin-pending-documents'],
    queryFn: async () => {
      // First get all pending documents
      const { data: documents, error: docError } = await supabase
        .from('booking_documents')
        .select('*')
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: true });

      if (docError) throw docError;
      if (!documents || documents.length === 0) return [];

      // Get unique booking IDs
      const bookingIds = [...new Set(documents.map(d => d.booking_id))];

      // Fetch booking details
      const { data: bookings, error: bookingError } = await supabase
        .from('booking_requests')
        .select('id, start_date, end_date, status, shopper_id, listing_id')
        .in('id', bookingIds);

      if (bookingError) throw bookingError;

      // Get listing IDs and shopper IDs
      const listingIds = [...new Set((bookings || []).map(b => b.listing_id))];
      const shopperIds = [...new Set((bookings || []).map(b => b.shopper_id))];

      // Fetch listings and profiles in parallel
      const [listingsResult, profilesResult] = await Promise.all([
        supabase.from('listings').select('id, title').in('id', listingIds),
        supabase.from('profiles').select('id, full_name, email').in('id', shopperIds),
      ]);

      const listings = listingsResult.data || [];
      const profiles = profilesResult.data || [];

      // Map everything together
      return documents.map(doc => {
        const booking = bookings?.find(b => b.id === doc.booking_id);
        const listing = listings.find(l => l.id === booking?.listing_id);
        const shopper = profiles.find(p => p.id === booking?.shopper_id);

        return {
          ...doc,
          booking: booking ? {
            ...booking,
            listing,
            shopper,
          } : undefined,
        } as AdminBookingDocument;
      });
    },
  });
}

// Fetch all documents for admin (all statuses)
export function useAdminAllDocuments() {
  return useQuery({
    queryKey: ['admin-all-documents'],
    queryFn: async () => {
      const { data: documents, error: docError } = await supabase
        .from('booking_documents')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(100);

      if (docError) throw docError;
      if (!documents || documents.length === 0) return [];

      // Get unique booking IDs
      const bookingIds = [...new Set(documents.map(d => d.booking_id))];

      // Fetch booking details
      const { data: bookings, error: bookingError } = await supabase
        .from('booking_requests')
        .select('id, start_date, end_date, status, shopper_id, listing_id')
        .in('id', bookingIds);

      if (bookingError) throw bookingError;

      // Get listing IDs and shopper IDs
      const listingIds = [...new Set((bookings || []).map(b => b.listing_id))];
      const shopperIds = [...new Set((bookings || []).map(b => b.shopper_id))];

      // Fetch listings and profiles in parallel
      const [listingsResult, profilesResult] = await Promise.all([
        supabase.from('listings').select('id, title').in('id', listingIds),
        supabase.from('profiles').select('id, full_name, email').in('id', shopperIds),
      ]);

      const listings = listingsResult.data || [];
      const profiles = profilesResult.data || [];

      // Map everything together
      return documents.map(doc => {
        const booking = bookings?.find(b => b.id === doc.booking_id);
        const listing = listings.find(l => l.id === booking?.listing_id);
        const shopper = profiles.find(p => p.id === booking?.shopper_id);

        return {
          ...doc,
          booking: booking ? {
            ...booking,
            listing,
            shopper,
          } : undefined,
        } as AdminBookingDocument;
      });
    },
  });
}

interface ReviewDocumentParams {
  documentId: string;
  bookingId: string;
  documentType: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

// Admin review document mutation
export function useAdminReviewDocument() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, status, rejectionReason }: ReviewDocumentParams) => {
      const { data, error } = await supabase
        .from('booking_documents')
        .update({
          status: status as DocumentStatus,
          rejection_reason: status === 'rejected' ? rejectionReason || null : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-documents'] });
      queryClient.invalidateQueries({ queryKey: ['booking-documents', variables.bookingId] });
      
      toast({
        title: variables.status === 'approved' ? 'Document approved' : 'Document rejected',
        description: variables.status === 'approved' 
          ? 'The document has been verified and the user will be notified.' 
          : 'The user has been notified to upload a new document.',
      });

      // Send notification email
      sendDocumentNotification(
        variables.bookingId,
        variables.documentType,
        variables.status,
        variables.rejectionReason
      );
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

// Helper to send document notification emails
async function sendDocumentNotification(
  bookingId: string,
  documentType: string,
  eventType: 'approved' | 'rejected',
  rejectionReason?: string
) {
  try {
    const { error } = await supabase.functions.invoke('send-document-notification', {
      body: {
        booking_id: bookingId,
        document_type: documentType,
        event_type: eventType,
        rejection_reason: rejectionReason,
      },
    });
    if (error) {
      console.error('Failed to send document notification:', error);
    }
  } catch (err) {
    console.error('Error sending document notification:', err);
  }
}

// Get document review stats for admin dashboard
export function useAdminDocumentStats() {
  const { data: pendingDocs } = useAdminPendingDocuments();
  const { data: allDocs } = useAdminAllDocuments();

  const pending = pendingDocs?.length || 0;
  const approved = allDocs?.filter(d => d.status === 'approved').length || 0;
  const rejected = allDocs?.filter(d => d.status === 'rejected').length || 0;
  const total = allDocs?.length || 0;

  return { pending, approved, rejected, total };
}
