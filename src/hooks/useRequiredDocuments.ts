import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { DocumentType, DocumentStatus, DocumentDeadlineType } from '@/types/documents';

// Types for required documents from listing
export interface ListingRequiredDocument {
  id: string;
  listing_id: string;
  document_type: DocumentType;
  is_required: boolean;
  deadline_type: DocumentDeadlineType;
  deadline_offset_hours: number | null;
  description: string | null;
}

// Types for uploaded booking documents
export interface BookingDocument {
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
}

// Helper to send document notification emails
async function sendDocumentNotification(
  bookingId: string,
  documentType: string,
  eventType: 'uploaded' | 'approved' | 'rejected',
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

// Fetch required documents for a listing
export function useListingRequiredDocuments(listingId: string | undefined) {
  return useQuery({
    queryKey: ['listing-required-documents', listingId],
    queryFn: async () => {
      if (!listingId) return [];
      
      const { data, error } = await supabase
        .from('listing_required_documents')
        .select('*')
        .eq('listing_id', listingId)
        .eq('is_required', true);

      if (error) throw error;
      return (data || []) as ListingRequiredDocument[];
    },
    enabled: !!listingId,
  });
}

// Fetch uploaded documents for a booking
export function useBookingDocuments(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking-documents', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      
      const { data, error } = await supabase
        .from('booking_documents')
        .select('*')
        .eq('booking_id', bookingId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BookingDocument[];
    },
    enabled: !!bookingId,
  });
}

// Upload a document for a booking
export function useUploadBookingDocument() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      documentType,
      file,
    }: {
      bookingId: string;
      documentType: DocumentType;
      file: File;
    }) => {
      if (!user) throw new Error('Must be logged in to upload documents');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${bookingId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('booking-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('booking-documents')
        .getPublicUrl(filePath);

      // Check if document already exists for this type
      const { data: existing } = await supabase
        .from('booking_documents')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('document_type', documentType)
        .maybeSingle();

      if (existing) {
        // Update existing document
        const { data, error } = await supabase
          .from('booking_documents')
          .update({
            file_url: urlData.publicUrl,
            file_name: file.name,
            status: 'pending',
            rejection_reason: null,
            uploaded_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return { document: data, bookingId, documentType };
      } else {
        // Create new document record
        const { data, error } = await supabase
          .from('booking_documents')
          .insert({
            booking_id: bookingId,
            document_type: documentType,
            file_url: urlData.publicUrl,
            file_name: file.name,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return { document: data, bookingId, documentType };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', result.bookingId] });
      toast({
        title: 'Document uploaded',
        description: 'Your document has been submitted for review.',
      });
      
      // Send email notification to host
      sendDocumentNotification(result.bookingId, result.documentType, 'uploaded');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });
}

// Delete a document
export function useDeleteBookingDocument() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, bookingId }: { documentId: string; bookingId: string }) => {
      const { error } = await supabase
        .from('booking_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      return { documentId, bookingId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', result.bookingId] });
      toast({
        title: 'Document removed',
        description: 'The document has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove document',
        variant: 'destructive',
      });
    },
  });
}

// Check if all required documents are submitted and approved
export function useDocumentComplianceStatus(listingId: string | undefined, bookingId: string | undefined) {
  const { data: requiredDocs, isLoading: loadingRequired } = useListingRequiredDocuments(listingId);
  const { data: uploadedDocs, isLoading: loadingUploaded } = useBookingDocuments(bookingId);

  const isLoading = loadingRequired || loadingUploaded;

  if (isLoading || !requiredDocs || !uploadedDocs) {
    return {
      isLoading,
      hasRequirements: false,
      allSubmitted: false,
      allApproved: false,
      pendingCount: 0,
      missingCount: 0,
      rejectedCount: 0,
      documentStatuses: [] as Array<{
        documentType: DocumentType;
        required: ListingRequiredDocument;
        uploaded: BookingDocument | null;
        status: 'missing' | 'pending' | 'approved' | 'rejected';
      }>,
    };
  }

  const documentStatuses = requiredDocs.map((req) => {
    const uploaded = uploadedDocs.find((doc) => doc.document_type === req.document_type);
    let status: 'missing' | 'pending' | 'approved' | 'rejected' = 'missing';
    
    if (uploaded) {
      status = uploaded.status;
    }

    return {
      documentType: req.document_type,
      required: req,
      uploaded: uploaded || null,
      status,
    };
  });

  const missingCount = documentStatuses.filter((d) => d.status === 'missing').length;
  const pendingCount = documentStatuses.filter((d) => d.status === 'pending').length;
  const rejectedCount = documentStatuses.filter((d) => d.status === 'rejected').length;
  const approvedCount = documentStatuses.filter((d) => d.status === 'approved').length;

  return {
    isLoading: false,
    hasRequirements: requiredDocs.length > 0,
    allSubmitted: missingCount === 0,
    allApproved: approvedCount === requiredDocs.length && requiredDocs.length > 0,
    pendingCount,
    missingCount,
    rejectedCount,
    documentStatuses,
  };
}
