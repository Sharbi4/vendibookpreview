import { useState } from 'react';
import {
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { HostDocumentReviewCard } from './HostDocumentReviewCard';
import {
  useListingRequiredDocuments,
  useBookingDocuments,
  useDocumentComplianceStatus,
} from '@/hooks/useRequiredDocuments';
import { useBatchApproveDocuments } from '@/hooks/useHostDocumentReview';
import { cn } from '@/lib/utils';

interface HostDocumentReviewSectionProps {
  listingId: string;
  bookingId: string;
  defaultOpen?: boolean;
  isInstantBook?: boolean;
}

export const HostDocumentReviewSection = ({
  listingId,
  bookingId,
  defaultOpen = false,
  isInstantBook = false,
}: HostDocumentReviewSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const { data: requiredDocs, isLoading: loadingRequired } = useListingRequiredDocuments(listingId);
  const { data: uploadedDocs, isLoading: loadingUploaded } = useBookingDocuments(bookingId);
  const compliance = useDocumentComplianceStatus(listingId, bookingId);
  const batchApproveMutation = useBatchApproveDocuments();

  if (loadingRequired || loadingUploaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading documents...
      </div>
    );
  }

  if (!requiredDocs || requiredDocs.length === 0) {
    return null;
  }

  const pendingDocs = uploadedDocs?.filter((d) => d.status === 'pending') || [];
  const hasPendingReviews = pendingDocs.length > 0;

  const handleApproveAll = () => {
    const pendingIds = pendingDocs.map((d) => d.id);
    if (pendingIds.length > 0) {
      batchApproveMutation.mutate({ bookingId, documentIds: pendingIds });
    }
  };

  // Status summary
  const getStatusSummary = () => {
    if (compliance.allApproved) {
      return {
        icon: CheckCircle2,
        text: 'All documents verified',
        className: 'text-emerald-600',
      };
    }
    if (compliance.pendingCount > 0) {
      return {
        icon: Clock,
        text: `${compliance.pendingCount} pending review`,
        className: 'text-amber-600',
      };
    }
    if (compliance.missingCount > 0) {
      return {
        icon: AlertTriangle,
        text: `${compliance.missingCount} not submitted`,
        className: 'text-muted-foreground',
      };
    }
    if (compliance.rejectedCount > 0) {
      return {
        icon: AlertTriangle,
        text: `${compliance.rejectedCount} rejected`,
        className: 'text-red-600',
      };
    }
    return {
      icon: FileText,
      text: 'Documents required',
      className: 'text-muted-foreground',
    };
  };

  const status = getStatusSummary();
  const StatusIcon = status.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left',
              hasPendingReviews && 'bg-amber-50 dark:bg-amber-950/20'
            )}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Required Documents</span>
              {hasPendingReviews && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                  {pendingDocs.length} to review
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-4 w-4', status.className)} />
              <span className={cn('text-xs', status.className)}>{status.text}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3">
            {/* Batch actions */}
            {hasPendingReviews && (
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {pendingDocs.length} document{pendingDocs.length > 1 ? 's' : ''} awaiting review
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApproveAll}
                  disabled={batchApproveMutation.isPending}
                >
                  {batchApproveMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approve All
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {uploadedDocs && uploadedDocs.length > 0 ? (
                uploadedDocs.map((doc) => (
                  <HostDocumentReviewCard
                    key={doc.id}
                    document={doc}
                    bookingId={bookingId}
                    isInstantBook={isInstantBook}
                  />
                ))
              ) : (
                <Alert className="bg-muted/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    The renter hasn't uploaded any documents yet.
                    {compliance.missingCount > 0 && (
                      <span className="block mt-1 text-muted-foreground">
                        {compliance.missingCount} required document
                        {compliance.missingCount > 1 ? 's' : ''} missing.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Compliance summary */}
            {compliance.allApproved && (
              <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-foreground dark:border-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-sm">
                  All required documents have been verified. This booking is compliant.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
