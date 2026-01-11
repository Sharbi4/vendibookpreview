import { useState } from 'react';
import { Shield, FileText, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { DocumentUploadCard } from './DocumentUploadCard';
import {
  useListingRequiredDocuments,
  useBookingDocuments,
  useUploadBookingDocument,
  useDeleteBookingDocument,
  useDocumentComplianceStatus,
} from '@/hooks/useRequiredDocuments';
import { DEADLINE_TYPE_LABELS } from '@/types/documents';
import type { DocumentType } from '@/types/documents';

interface DocumentUploadSectionProps {
  listingId: string;
  bookingId: string;
  onComplianceChange?: (isCompliant: boolean) => void;
}

export const DocumentUploadSection = ({
  listingId,
  bookingId,
  onComplianceChange,
}: DocumentUploadSectionProps) => {
  const [uploadingDocType, setUploadingDocType] = useState<DocumentType | null>(null);
  
  const { data: requiredDocs, isLoading: loadingRequired } = useListingRequiredDocuments(listingId);
  const { data: uploadedDocs, isLoading: loadingUploaded } = useBookingDocuments(bookingId);
  const uploadMutation = useUploadBookingDocument();
  const deleteMutation = useDeleteBookingDocument();

  const compliance = useDocumentComplianceStatus(listingId, bookingId);

  // Notify parent of compliance changes
  const isCompliant = compliance.allSubmitted;
  
  if (loadingRequired || loadingUploaded) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-48" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (!requiredDocs || requiredDocs.length === 0) {
    return null;
  }

  const deadlineType = requiredDocs[0]?.deadline_type;
  const deadlineHours = requiredDocs[0]?.deadline_offset_hours;
  const submittedCount = requiredDocs.length - compliance.missingCount;
  const progress = (submittedCount / requiredDocs.length) * 100;

  const handleUpload = async (documentType: DocumentType, file: File) => {
    setUploadingDocType(documentType);
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        documentType,
        file,
      });
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    await deleteMutation.mutateAsync({ documentId, bookingId });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Required Documents</h3>
      </div>

      {/* Info banner */}
      <Alert className="bg-muted/50 border-border">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          This rental requires document verification.{' '}
          {deadlineType && (
            <span className="font-medium">
              {DEADLINE_TYPE_LABELS[deadlineType]}
              {deadlineType === 'after_approval_deadline' && deadlineHours && (
                <> ({deadlineHours} hours before booking starts)</>
              )}
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {submittedCount} of {requiredDocs.length} documents submitted
          </span>
          {compliance.allSubmitted ? (
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              All submitted
            </span>
          ) : compliance.rejectedCount > 0 ? (
            <span className="text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {compliance.rejectedCount} rejected
            </span>
          ) : null}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Document cards */}
      <div className="space-y-3">
        {requiredDocs.map((requirement) => {
          const uploaded = uploadedDocs?.find(
            (doc) => doc.document_type === requirement.document_type
          );

          return (
            <DocumentUploadCard
              key={requirement.id}
              requirement={requirement}
              uploadedDocument={uploaded || null}
              onUpload={(file) => handleUpload(requirement.document_type, file)}
              onDelete={uploaded ? () => handleDelete(uploaded.id) : undefined}
              isUploading={uploadingDocType === requirement.document_type}
            />
          );
        })}
      </div>

      {/* Compliance message */}
      {!compliance.allSubmitted && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
            Please upload all required documents to proceed with your booking.
          </AlertDescription>
        </Alert>
      )}

      {compliance.allApproved && (
        <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-sm">
            All documents have been verified. Your booking is ready!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
