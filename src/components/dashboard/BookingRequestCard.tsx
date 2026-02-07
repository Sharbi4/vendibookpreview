import { useState } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { Check, X, Calendar, User, MessageSquare, Loader2, MessageCircle, FileText, DollarSign, FileCheck, FileClock, FileWarning, Zap, Shield, AlertTriangle, Undo2, Building2, Users, ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MessageDialog } from '@/components/messaging/MessageDialog';
import { HostDocumentReviewSection } from '@/components/documents/HostDocumentReviewSection';
import { useDocumentComplianceStatus } from '@/hooks/useRequiredDocuments';
import { DocumentComplianceBadge } from './DocumentComplianceBadge';
import InstantBookTimeline from './InstantBookTimeline';
import BookingPhaseIndicator, { getBookingPhase } from './BookingPhaseIndicator';
import BookingConfirmationSection from './BookingConfirmationSection';
import { AddToCalendarButton } from '@/components/booking/AddToCalendarButton';

// Type for business info stored in JSONB
interface BusinessInfoData {
  licenseType: string;
  licenseTypeOther?: string;
  businessDescription: string;
  employeesFullTime: string;
  employeesPartTime: string;
  hasWorkersComp: string;
  isCertifiedManager: string;
  productsToPrepare: string;
  equipmentToUse: string;
}

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
    is_instant_book?: boolean | null;
    deposit_amount?: number | null;
    deposit_status?: string | null;
    deposit_refund_notes?: string | null;
    host_confirmed_at?: string | null;
    shopper_confirmed_at?: string | null;
    dispute_status?: string | null;
    business_info?: unknown;
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
  onDepositAction?: (bookingId: string, action: 'refund' | 'partial' | 'forfeit', deductionAmount?: number, notes?: string) => Promise<unknown>;
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


const BookingRequestCard = ({ booking, onApprove, onDecline, onCancel, onDepositAction }: BookingRequestCardProps) => {
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const [responseAction, setResponseAction] = useState<'approve' | 'decline'>('approve');
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [usePartialRefund, setUsePartialRefund] = useState(false);
  const [partialRefundAmount, setPartialRefundAmount] = useState('');
  const [depositAction, setDepositAction] = useState<'refund' | 'partial' | 'forfeit'>('refund');
  
  // Parse business info from booking
  const businessInfo = booking.business_info as BusinessInfoData | null;
  const [depositDeduction, setDepositDeduction] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

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
  const isCompleted = booking.status === 'completed';
  const isPaid = booking.payment_status === 'paid';
  const canCancel = isApproved && isPaid && onCancel;
  const canMessage = booking.status !== 'cancelled' && booking.status !== 'declined';
  const isInstantBook = booking.is_instant_book === true;
  const bookingCancelled = booking.status === 'cancelled';
  const bookingConfirmed = isApproved && (!hasDocumentRequirements || compliance.allApproved);
  
  // Deposit logic
  const hasDeposit = (booking.deposit_amount ?? 0) > 0;
  const depositStatus = booking.deposit_status || 'pending';
  const depositAmount = booking.deposit_amount || 0;
  const rentalEnded = isPast(parseISO(booking.end_date));
  const canManageDeposit = hasDeposit && 
    (isCompleted || (isApproved && rentalEnded)) && 
    depositStatus === 'charged' && 
    onDepositAction;

  // Confirmation tracking
  const hostConfirmedAt = booking.host_confirmed_at || null;
  const shopperConfirmedAt = booking.shopper_confirmed_at || null;
  const disputeStatus = booking.dispute_status || null;

  // Get booking phase for status display
  const bookingPhase = getBookingPhase({
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
    paymentStatus: booking.payment_status,
    hostConfirmedAt,
    shopperConfirmedAt,
    disputeStatus,
  });

  const showConfirmationSection = bookingPhase === 'ended_awaiting_confirmation' && !hostConfirmedAt;

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

  const openDepositDialog = () => {
    setDepositAction('refund');
    setDepositDeduction('');
    setDepositNotes('');
    setShowDepositDialog(true);
  };

  const handleDepositAction = async () => {
    if (!onDepositAction) return;
    
    setIsProcessingDeposit(true);
    try {
      const deductionAmount = depositAction === 'partial' && depositDeduction 
        ? parseFloat(depositDeduction) 
        : undefined;
      
      await onDepositAction(booking.id, depositAction, deductionAmount, depositNotes);
      setShowDepositDialog(false);
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border shadow-md bg-card">
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
                {booking.is_instant_book && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Zap className="h-3 w-3" />
                    Instant Book
                  </span>
                )}
                <StatusPill status={booking.status} />
                <DocumentComplianceBadge compliance={compliance} />
              </div>
            </div>

            {/* Instant Book Timeline for hosts */}
            {isInstantBook && hasDocumentRequirements && (
              <div className="mb-3 bg-muted/30 rounded-lg px-3">
                <InstantBookTimeline
                  isPaid={isPaid}
                  documentsSubmitted={compliance.allSubmitted}
                  documentsApproved={compliance.allApproved}
                  documentsRejected={compliance.rejectedCount > 0}
                  bookingConfirmed={bookingConfirmed}
                  bookingCancelled={bookingCancelled}
                />
              </div>
            )}

            {/* Booking Phase Indicator - Show for approved paid bookings */}
            {isApproved && isPaid && (
              <div className="mb-3">
                <BookingPhaseIndicator
                  startDate={booking.start_date}
                  endDate={booking.end_date}
                  status={booking.status}
                  paymentStatus={booking.payment_status}
                  hostConfirmedAt={hostConfirmedAt}
                  shopperConfirmedAt={shopperConfirmedAt}
                  disputeStatus={disputeStatus}
                />
              </div>
            )}

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

            {/* Deposit Required Preview - Show when deposit configured but not yet paid */}
            {hasDeposit && !isPaid && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Shield className="h-3.5 w-3.5" />
                <span>${depositAmount.toFixed(2)} deposit will be collected at checkout</span>
              </div>
            )}

            {/* Deposit Status Indicator - Only show when deposit is actually collected (paid) */}
            {hasDeposit && isPaid && (
              <div className={`flex items-center justify-between p-3 mb-3 rounded-lg border ${
                depositStatus === 'refunded' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' :
                depositStatus === 'forfeited' ? 'bg-destructive/10 border-destructive/20' :
                depositStatus === 'charged' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' :
                'bg-muted/50 border-border'
              }`}>
                <div className="flex items-center gap-2">
                  <Shield className={`h-4 w-4 ${
                    depositStatus === 'refunded' ? 'text-emerald-600' :
                    depositStatus === 'forfeited' ? 'text-destructive' :
                    depositStatus === 'charged' ? 'text-blue-600' :
                    'text-muted-foreground'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">
                      Security Deposit: ${depositAmount.toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      depositStatus === 'refunded' ? 'text-emerald-600' :
                      depositStatus === 'forfeited' ? 'text-destructive' :
                      depositStatus === 'charged' ? 'text-blue-600' :
                      'text-muted-foreground'
                    }`}>
                      {depositStatus === 'charged' && (rentalEnded ? 'Ready for release' : 'Held until rental ends')}
                      {depositStatus === 'refunded' && 'Refunded to renter'}
                      {depositStatus === 'forfeited' && (booking.deposit_refund_notes || 'Forfeited')}
                    </p>
                  </div>
                </div>
                {canManageDeposit && (
                  <Button size="sm" variant="outline" onClick={openDepositDialog}>
                    <Undo2 className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                )}
              </div>
            )}

            {/* Message */}
            {booking.message && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="line-clamp-2">{booking.message}</p>
              </div>
            )}

            {/* Business Info Section - For shared kitchen/food truck/trailer bookings */}
            {businessInfo && (
              <Collapsible open={showBusinessInfo} onOpenChange={setShowBusinessInfo} className="mb-3">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted/70 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Applicant Business Details</span>
                    </div>
                    {showBusinessInfo ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg bg-background space-y-4">
                    {/* License & Business Description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">License Type</span>
                        <span className="text-sm font-medium">
                          {businessInfo.licenseType === 'Other' ? businessInfo.licenseTypeOther : businessInfo.licenseType}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Employees</span>
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {businessInfo.employeesFullTime || '0'} FT / {businessInfo.employeesPartTime || '0'} PT
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Business Description</span>
                      <p className="text-sm text-muted-foreground">{businessInfo.businessDescription}</p>
                    </div>

                    {/* Compliance flags */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-1.5">
                        {businessInfo.hasWorkersComp === 'yes' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">Worker's Comp</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {businessInfo.isCertifiedManager === 'yes' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">Certified Manager</span>
                      </div>
                    </div>

                    {/* Kitchen Use */}
                    <div className="pt-3 border-t border-border space-y-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Intended Kitchen Use</span>
                      
                      {businessInfo.productsToPrepare && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <span className="text-xs font-semibold block mb-1">Products to Prepare</span>
                          <p className="text-sm text-muted-foreground">{businessInfo.productsToPrepare}</p>
                        </div>
                      )}
                      
                      {businessInfo.equipmentToUse && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <span className="text-xs font-semibold block mb-1">Equipment to Use</span>
                          <p className="text-sm text-muted-foreground">{businessInfo.equipmentToUse}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Document Review Section */}
            {hasDocumentRequirements && listingId && (
              <div className="mb-3">
                <HostDocumentReviewSection
                  listingId={listingId}
                  bookingId={booking.id}
                  defaultOpen={hasPendingDocReviews}
                  isInstantBook={booking.is_instant_book === true}
                />
              </div>
            )}

            {/* Booking End Confirmation Section */}
            {showConfirmationSection && (
              <div className="mb-3">
                <BookingConfirmationSection
                  bookingId={booking.id}
                  isHost={true}
                  hostConfirmedAt={hostConfirmedAt}
                  shopperConfirmedAt={shopperConfirmedAt}
                  disputeStatus={disputeStatus}
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
              
              {/* Add to Calendar - show for approved paid bookings */}
              {isApproved && isPaid && booking.listing && (
                <AddToCalendarButton
                  title={`Rental: ${booking.listing.title}`}
                  startDate={booking.start_date}
                  endDate={booking.end_date}
                  location={undefined}
                />
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

      {/* Deposit Management Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Manage Security Deposit
            </DialogTitle>
            <DialogDescription>
              The rental has ended. Release or deduct from the ${depositAmount.toFixed(2)} security deposit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Selection */}
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setDepositAction('refund')}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  depositAction === 'refund' 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`p-2 rounded-full ${depositAction === 'refund' ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'}`}>
                  <Check className={`h-4 w-4 ${depositAction === 'refund' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">Full Refund</p>
                  <p className="text-xs text-muted-foreground">No damage or issues - return full deposit</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepositAction('partial')}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  depositAction === 'partial' 
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`p-2 rounded-full ${depositAction === 'partial' ? 'bg-amber-100 dark:bg-amber-900' : 'bg-muted'}`}>
                  <DollarSign className={`h-4 w-4 ${depositAction === 'partial' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">Partial Deduction</p>
                  <p className="text-xs text-muted-foreground">Deduct for minor damage or cleaning</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepositAction('forfeit')}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  depositAction === 'forfeit' 
                    ? 'border-destructive bg-destructive/10' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`p-2 rounded-full ${depositAction === 'forfeit' ? 'bg-destructive/20' : 'bg-muted'}`}>
                  <AlertTriangle className={`h-4 w-4 ${depositAction === 'forfeit' ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">Full Forfeit</p>
                  <p className="text-xs text-muted-foreground">Significant damage or late return</p>
                </div>
              </button>
            </div>

            {/* Deduction Amount (for partial) */}
            {depositAction === 'partial' && (
              <div>
                <Label htmlFor="depositDeduction">Deduction Amount</Label>
                <div className="relative mt-1.5">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="depositDeduction"
                    type="number"
                    min="0.01"
                    max={depositAmount}
                    step="0.01"
                    placeholder={`Max: ${depositAmount.toFixed(2)}`}
                    value={depositDeduction}
                    onChange={(e) => setDepositDeduction(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Renter will receive: ${depositDeduction ? Math.max(0, depositAmount - parseFloat(depositDeduction)).toFixed(2) : depositAmount.toFixed(2)}
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="depositNotes">
                {depositAction === 'refund' ? 'Notes (Optional)' : 'Reason for deduction'}
              </Label>
              <Textarea
                id="depositNotes"
                placeholder={
                  depositAction === 'refund' 
                    ? 'Optional: Add any notes about the rental...' 
                    : 'Describe the damage, issue, or reason for deduction...'
                }
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDepositAction}
              disabled={isProcessingDeposit || (depositAction === 'partial' && (!depositDeduction || parseFloat(depositDeduction) <= 0 || parseFloat(depositDeduction) > depositAmount)) || ((depositAction === 'partial' || depositAction === 'forfeit') && !depositNotes.trim())}
              className={depositAction === 'refund' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              variant={depositAction === 'forfeit' ? 'destructive' : 'default'}
            >
              {isProcessingDeposit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {depositAction === 'refund' && `Refund $${depositAmount.toFixed(2)}`}
              {depositAction === 'partial' && depositDeduction && `Refund $${Math.max(0, depositAmount - parseFloat(depositDeduction)).toFixed(2)}`}
              {depositAction === 'partial' && !depositDeduction && 'Enter deduction'}
              {depositAction === 'forfeit' && 'Forfeit Deposit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default BookingRequestCard;
