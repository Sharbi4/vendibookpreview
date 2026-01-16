import { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';
import type { DocumentStatus } from '@/types/documents';
import type { BookingDocument } from '@/hooks/useRequiredDocuments';
import { useReviewBookingDocument } from '@/hooks/useHostDocumentReview';
import { format } from 'date-fns';

interface HostDocumentReviewCardProps {
  document: BookingDocument;
  bookingId: string;
  isInstantBook?: boolean;
}

const StatusBadge = ({ status }: { status: DocumentStatus }) => {
  const config = {
    pending: {
      label: 'Pending Review',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-foreground',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-foreground',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-foreground',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

export const HostDocumentReviewCard = ({ document, bookingId, isInstantBook = false }: HostDocumentReviewCardProps) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const reviewMutation = useReviewBookingDocument();

  const isPending = document.status === 'pending';

  const handleApprove = () => {
    reviewMutation.mutate({
      documentId: document.id,
      bookingId,
      documentType: document.document_type,
      status: 'approved',
    });
  };

  const handleReject = () => {
    reviewMutation.mutate({
      documentId: document.id,
      bookingId,
      documentType: document.document_type,
      status: 'rejected',
      rejectionReason: rejectionReason.trim() || undefined,
    });
    setShowRejectDialog(false);
    setRejectionReason('');
  };

  return (
    <>
      <div
        className={cn(
          'rounded-lg border p-3 transition-all',
          document.status === 'approved'
            ? 'bg-emerald-50/50 border-foreground dark:bg-emerald-950/20 dark:border-foreground'
            : document.status === 'rejected'
            ? 'bg-red-50/50 border-foreground dark:bg-red-950/20 dark:border-foreground'
            : 'bg-card border-border'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium text-sm text-foreground truncate">
              {DOCUMENT_TYPE_LABELS[document.document_type]}
            </span>
          </div>
          <StatusBadge status={document.status} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="truncate">{document.file_name}</span>
          <span>•</span>
          <span>{format(new Date(document.uploaded_at), 'MMM d, h:mm a')}</span>
        </div>

        {document.status === 'rejected' && document.rejection_reason && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded p-2 mb-2">
            <strong>Rejection reason:</strong> {document.rejection_reason}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => window.open(document.file_url, '_blank')}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>

          {isPending && (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowRejectDialog(true)}
                disabled={reviewMutation.isPending}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Please provide a reason so the renter knows what to fix.
            </DialogDescription>
          </DialogHeader>

          {isInstantBook && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Instant Book Warning</p>
                <p className="text-destructive/80 mt-1">
                  Rejecting this document will <strong>automatically cancel the booking</strong> and issue a <strong>full refund</strong> to the renter.
                </p>
              </div>
            </div>
          )}

          <Textarea
            placeholder="e.g., Document is expired, image is blurry, wrong document type..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isInstantBook ? 'Reject & Cancel Booking' : 'Reject Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
