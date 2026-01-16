import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Calendar, User, MessageSquare, Loader2, MessageCircle, FileText, DollarSign, FileCheck, FileClock, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageDialog } from '@/components/messaging/MessageDialog';
import { HostDocumentReviewSection } from '@/components/documents/HostDocumentReviewSection';
import { useDocumentComplianceStatus } from '@/hooks/useRequiredDocuments';

interface BookingRequestCardProps {
  booking: {
    id: string;
    start_date: string;
    end_date: string;
    message: string | null;
    status: string;
    total_price: number;
    created_at: string;
    listing_id: string;
    payment_status?: string | null;
    listing?: {
      id?: string;
      title: string;
      cover_image_url: string | null;
      category: string;
    };
    shopper?: {
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
  };
  onApprove: (id: string, response?: string) => void;
  onDecline: (id: string, response?: string) => void;
  onCancel?: (id: string, reason?: string, refundAmount?: number) => Promise<unknown>;
}

const StatusPill = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    declined: 'bg-destructive/10 text-destructive',
    cancelled: 'bg-muted text-muted-foreground',
    completed: 'bg-primary/10 text-primary',
  };

  const labels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    declined: 'Declined',
    cancelled: 'Cancelled',
    completed: 'Completed',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

const DocumentCompliancePill = ({ compliance }: { 
  compliance: { 
    allApproved: boolean; 
    hasRequirements: boolean; 
    missingCount: number; 
    pendingCount: number; 
    rejectedCount: number;
    documentStatuses: Array<{ status: string }>;
  } 
}) => {
  if (!compliance.hasRequirements) return null;

  const approvedCount = compliance.documentStatuses.filter(d => d.status === 'approved').length;

  // All documents approved
  if (compliance.allApproved && approvedCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <FileCheck className="h-3 w-3" />
        Docs Complete
      </span>
    );
  }

  // Has rejected documents
  if (compliance.rejectedCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
        <FileWarning className="h-3 w-3" />
        {compliance.rejectedCount} Rejected
      </span>
    );
  }

  // Has pending documents awaiting review
  if (compliance.pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <FileClock className="h-3 w-3" />
        {compliance.pendingCount} Pending Review
      </span>
    );
  }

  // Missing documents (not uploaded yet)
  if (compliance.missingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        <FileText className="h-3 w-3" />
        {compliance.missingCount} Missing
      </span>
    );
  }

  return null;
};

const BookingRequestCard = ({ booking, onApprove, onDecline, onCancel }: BookingRequestCardProps) => {
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [responseAction, setResponseAction] = useState<'approve' | 'decline'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [usePartialRefund, setUsePartialRefund] = useState(false);
  const [partialRefundAmount, setPartialRefundAmount] = useState('');

  // Get listing ID for document check
  const listingId = booking.listing_id || booking.listing?.id;
  
  // Check document compliance for this booking
  const compliance = useDocumentComplianceStatus(listingId, booking.id);
  const hasDocumentRequirements = compliance.hasRequirements;
  const hasPendingDocReviews = compliance.pendingCount > 0;

  const shopperInitials = booking.shopper?.full_name
    ? booking.shopper.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleAction = (action: 'approve' | 'decline') => {
    setResponseAction(action);
    setResponseMessage('');
    setShowResponseDialog(true);
  };

  const handleSubmitResponse = async () => {
    setIsSubmitting(true);
    if (responseAction === 'approve') {
      await onApprove(booking.id, responseMessage);
    } else {
      await onDecline(booking.id, responseMessage);
    }
    setIsSubmitting(false);
    setShowResponseDialog(false);
  };

  const isPending = booking.status === 'pending';
  const isApproved = booking.status === 'approved';
  const isPaid = booking.payment_status === 'paid';
  const canCancel = isApproved && isPaid && onCancel;
  const canMessage = booking.status !== 'cancelled' && booking.status !== 'declined';

  const handleCancelBooking = async () => {
    if (!onCancel) return;
    
    setIsCancelling(true);
    try {
      const refundAmount = usePartialRefund && partialRefundAmount 
        ? parseFloat(partialRefundAmount) 
        : undefined;
      
      await onCancel(booking.id, cancelReason || 'Cancelled by host', refundAmount);
      setShowCancelDialog(false);
      setCancelReason('');
      setUsePartialRefund(false);
      setPartialRefundAmount('');
    } finally {
      setIsCancelling(false);
    }
  };

  const openCancelDialog = () => {
    setCancelReason('');
    setUsePartialRefund(false);
    setPartialRefundAmount('');
    setShowCancelDialog(true);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden card-hover">
        <div className="flex flex-col sm:flex-row">
          {/* Listing Image */}
          <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
            <img
              src={booking.listing?.cover_image_url || '/placeholder.svg'}
              alt={booking.listing?.title || 'Listing'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {booking.listing?.title || 'Listing'}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                  </span>
                </div>
                </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusPill status={booking.status} />
                <DocumentCompliancePill compliance={compliance} />
              </div>
            </div>

            {/* Shopper Info */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={booking.shopper?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {shopperInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">
                  {booking.shopper?.full_name || 'Guest'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {booking.shopper?.email}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">${booking.total_price}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Message */}
            {booking.message && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="line-clamp-2">{booking.message}</p>
              </div>
            )}

            {/* Document Review Section */}
            {hasDocumentRequirements && listingId && (
              <div className="mb-3">
                <HostDocumentReviewSection
                  listingId={listingId}
                  bookingId={booking.id}
                  defaultOpen={hasPendingDocReviews}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              {isPending && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAction('approve')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleAction('decline')}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </>
              )}
              {/* Cancel & Refund button for paid approved bookings */}
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={openCancelDialog}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel & Refund
                </Button>
              )}
              {canMessage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMessageDialog(true)}
                  className={isPending || canCancel ? '' : 'ml-0'}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseAction === 'approve' ? 'Approve Booking' : 'Decline Booking'}
            </DialogTitle>
            <DialogDescription>
              {responseAction === 'approve'
                ? 'Confirm this booking request. You can add a message for the guest.'
                : 'Are you sure you want to decline this request? You can provide a reason.'}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder={
              responseAction === 'approve'
                ? 'Add a welcome message (optional)...'
                : 'Reason for declining (optional)...'
            }
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={isSubmitting}
              className={responseAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              variant={responseAction === 'decline' ? 'destructive' : 'default'}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {responseAction === 'approve' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel & Refund Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking & Process Refund</DialogTitle>
            <DialogDescription>
              This booking has been paid (${booking.total_price}). You can issue a full or partial refund.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cancelReason">Reason for cancellation</Label>
              <Textarea
                id="cancelReason"
                placeholder="Explain why you're cancelling this booking..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="partialRefund" className="text-sm font-medium">
                  Partial Refund
                </Label>
                <p className="text-xs text-muted-foreground">
                  Issue a custom refund amount instead of full refund
                </p>
              </div>
              <Switch
                id="partialRefund"
                checked={usePartialRefund}
                onCheckedChange={setUsePartialRefund}
              />
            </div>

            {usePartialRefund && (
              <div>
                <Label htmlFor="refundAmount">Refund Amount</Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="refundAmount"
                    type="number"
                    min="0.01"
                    max={booking.total_price}
                    step="0.01"
                    placeholder={`Max: ${booking.total_price}`}
                    value={partialRefundAmount}
                    onChange={(e) => setPartialRefundAmount(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Full booking amount: ${booking.total_price}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling || (usePartialRefund && (!partialRefundAmount || parseFloat(partialRefundAmount) <= 0 || parseFloat(partialRefundAmount) > booking.total_price))}
            >
              {isCancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {usePartialRefund && partialRefundAmount 
                ? `Refund $${parseFloat(partialRefundAmount).toFixed(2)}`
                : `Full Refund $${booking.total_price}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <MessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        bookingId={booking.id}
        listingTitle={booking.listing?.title || 'Booking'}
        otherPartyName={booking.shopper?.full_name || 'Guest'}
      />
    </>
  );
};

export default BookingRequestCard;
