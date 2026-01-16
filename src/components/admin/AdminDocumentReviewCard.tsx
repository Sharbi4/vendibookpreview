import { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  AlertTriangle,
  User,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { AdminBookingDocument } from '@/hooks/useAdminDocumentReview';
import { useAdminReviewDocument } from '@/hooks/useAdminDocumentReview';
import { format } from 'date-fns';

interface AdminDocumentReviewCardProps {
  document: AdminBookingDocument;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  showCheckbox?: boolean;
}

const StatusBadge = ({ status }: { status: DocumentStatus }) => {
  const config = {
    pending: {
      label: 'Pending Review',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-amber-300',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-red-300',
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

export const AdminDocumentReviewCard = ({ 
  document, 
  isSelected = false, 
  onSelectionChange,
  showCheckbox = false 
}: AdminDocumentReviewCardProps) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const reviewMutation = useAdminReviewDocument();

  const isPending = document.status === 'pending';

  const handleApprove = () => {
    reviewMutation.mutate({
      documentId: document.id,
      bookingId: document.booking_id,
      documentType: document.document_type,
      status: 'approved',
    });
  };

  const handleReject = () => {
    reviewMutation.mutate({
      documentId: document.id,
      bookingId: document.booking_id,
      documentType: document.document_type,
      status: 'rejected',
      rejectionReason: rejectionReason.trim() || undefined,
    });
    setShowRejectDialog(false);
    setRejectionReason('');
  };

  return (
    <>
      <Card className={cn(
        'transition-all',
        document.status === 'approved'
          ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10'
          : document.status === 'rejected'
          ? 'border-red-200 bg-red-50/30 dark:bg-red-950/10'
          : 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/10'
      )}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            {/* Left: Document info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {showCheckbox && isPending && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectionChange?.(!!checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                  )}
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">
                      {DOCUMENT_TYPE_LABELS[document.document_type]}
                    </span>
                    <p className="text-sm text-muted-foreground">{document.file_name}</p>
                  </div>
                </div>
                <StatusBadge status={document.status} />
              </div>

              {/* Booking/User info */}
              {document.booking && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{document.booking.shopper?.full_name || 'Unknown User'}</span>
                    {document.booking.shopper?.email && (
                      <span className="text-xs">({document.booking.shopper.email})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(document.booking.start_date), 'MMM d')} - {format(new Date(document.booking.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {document.booking.listing && (
                    <div className="sm:col-span-2 flex items-center gap-2 text-muted-foreground">
                      <ExternalLink className="h-4 w-4" />
                      <span className="truncate">{document.booking.listing.title}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Uploaded: {format(new Date(document.uploaded_at), 'MMM d, yyyy h:mm a')}
              </div>

              {document.status === 'rejected' && document.rejection_reason && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded p-2">
                  <strong>Rejection reason:</strong> {document.rejection_reason}
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-row md:flex-col items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.file_url, '_blank')}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Document
              </Button>

              {isPending && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleApprove}
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={reviewMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Please provide a reason so the user knows what to fix. They will receive an email notification.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="e.g., Document is expired, image is blurry, wrong document type, name doesn't match..."
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
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDocumentReviewCard;
