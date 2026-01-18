import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DocumentType, DocumentStatus } from '@/types/documents';

export interface UserDocument {
  id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  status: DocumentStatus;
  uploaded_at: string;
  booking_id: string;
}

/**
 * Hook to fetch all documents a user has ever uploaded across all bookings.
 * Returns the most recent version of each document type with its approval status.
 */
export function useUserDocuments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all booking IDs for this user
      const { data: bookings, error: bookingsError } = await supabase
        .from('booking_requests')
        .select('id')
        .eq('shopper_id', user.id);

      if (bookingsError) throw bookingsError;
      if (!bookings || bookings.length === 0) return [];

      const bookingIds = bookings.map(b => b.id);

      // Get all documents for these bookings
      const { data: documents, error: docsError } = await supabase
        .from('booking_documents')
        .select('*')
        .in('booking_id', bookingIds)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;
      if (!documents) return [];

      // Group by document_type and get the most recent/best status for each
      const documentsByType = new Map<DocumentType, UserDocument>();

      for (const doc of documents) {
        const existingDoc = documentsByType.get(doc.document_type as DocumentType);
        
        if (!existingDoc) {
          documentsByType.set(doc.document_type as DocumentType, doc as UserDocument);
        } else {
          // Prefer approved documents, then most recent
          if (doc.status === 'approved' && existingDoc.status !== 'approved') {
            documentsByType.set(doc.document_type as DocumentType, doc as UserDocument);
          }
        }
      }

      return Array.from(documentsByType.values());
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Helper to check if user has a specific document type that's approved
 */
export function useHasApprovedDocument(documentType: DocumentType) {
  const { data: documents, isLoading } = useUserDocuments();
  
  const hasApproved = documents?.some(
    doc => doc.document_type === documentType && doc.status === 'approved'
  ) ?? false;

  const document = documents?.find(doc => doc.document_type === documentType);

  return {
    hasApproved,
    document,
    isLoading,
  };
}

export default useUserDocuments;
