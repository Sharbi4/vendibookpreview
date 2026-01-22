import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast, parseISO } from 'date-fns';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  X,
  MessageCircle,
  Star,
  CreditCard,
  Loader2,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Undo2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import InstantBookTimeline from './InstantBookTimeline';
import BookingPhaseIndicator, { getBookingPhase } from './BookingPhaseIndicator';
import BookingConfirmationSection from './BookingConfirmationSection';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MessageDialog } from '@/components/messaging/MessageDialog';
import ReviewForm from '@/components/reviews/ReviewForm';
import { DocumentUploadSection } from '@/components/documents/DocumentUploadSection';
import { PriceBreakdownModal, CheckoutOverlay } from '@/components/checkout';
import { useBookingReview } from '@/hooks/useReviews';
import { useDocumentComplianceStatus } from '@/hooks/useRequiredDocuments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS } from '@/types/listing';
import type { ShopperBooking } from '@/hooks/useShopperBookings';

interface ShopperBookingCardProps {
  booking: ShopperBooking;
  onCancel: (id: string, reason?: string) => Promise<unknown>;
  onPaymentInitiated?: () => void;
}

const StatusBadge = ({ status }: { status: ShopperBooking['status'] }) => {
  const config = {
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-foreground',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-foreground',
    },
    declined: {
      label: 'Declined',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-foreground',
    },
    cancelled: {
      label: 'Cancelled',
      icon: X,
      className: 'bg-muted text-muted-foreground border-foreground',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      className: 'bg-blue-100 text-blue-700 border-foreground',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const PaymentStatusBadge = ({ status }: { status: string | null }) => {
  if (!status || status === 'unpaid') return null;
  
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Payment Pending',
      className: 'bg-amber-100 text-amber-700 border-foreground',
    },
    paid: {
      label: 'Paid',
      className: 'bg-emerald-100 text-emerald-700 border-foreground',
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-purple-100 text-purple-700 border-foreground',
    },
    failed: {
      label: 'Payment Failed',
      className: 'bg-red-100 text-red-700 border-foreground',
    },
  };

  const { label, className } = config[status] || { label: status, className: 'bg-muted text-muted-foreground' };

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <DollarSign className="h-3 w-3" />
      {label}
    </Badge>
  );
};

const ShopperBookingCard = ({ booking, onCancel, onPaymentInitiated }: ShopperBookingCardProps) => {
  const { toast } = useToast();
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [showCheckoutOverlay, setShowCheckoutOverlay] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { data: existingReview } = useBookingReview(booking.id);
  
  const listing = booking.listing;
  const listingId = listing?.id;
  
  // Check document compliance
  const compliance = useDocumentComplianceStatus(listingId, booking.id);
  
  const location = listing?.address || listing?.pickup_location_text || 'Location TBD';
  const isPending = booking.status === 'pending';
  const isApproved = booking.status === 'approved';
  const isCompleted = booking.status === 'completed';
  const canReview = isCompleted && !existingReview;
  const canMessage = booking.status !== 'cancelled' && booking.status !== 'declined';
  
  // Check if payment is needed (approved but not paid)
  const paymentStatus = (booking as any).payment_status as string | null;
  const needsPayment = isApproved && (!paymentStatus || paymentStatus === 'unpaid' || paymentStatus === 'failed');
  const isPaid = paymentStatus === 'paid';
  
  // Check if documents need attention
  const hasDocumentRequirements = compliance.hasRequirements;
  const needsDocuments = hasDocumentRequirements && !compliance.allSubmitted;
  const hasRejectedDocs = compliance.rejectedCount > 0;
  
  // Instant Book state
  const isInstantBook = (booking as any).is_instant_book === true;
  const bookingCancelled = booking.status === 'cancelled';
  const bookingConfirmed = isApproved && isPaid;

  // Deposit state
  const depositAmount = (booking as any).deposit_amount as number | null;
  const depositStatus = ((booking as any).deposit_status as string) || 'pending';
  const depositRefundNotes = (booking as any).deposit_refund_notes as string | null;
  const hasDeposit = (depositAmount ?? 0) > 0;
  const rentalEnded = isPast(parseISO(booking.end_date));

  // Confirmation tracking
  const hostConfirmedAt = (booking as any).host_confirmed_at as string | null;
  const shopperConfirmedAt = (booking as any).shopper_confirmed_at as string | null;
  const disputeStatus = (booking as any).dispute_status as string | null;

  // Get booking phase for status display
  const bookingPhase = getBookingPhase({
    startDate: booking.start_date,
    endDate: booking.end_date,
    status: booking.status,
    paymentStatus,
    hostConfirmedAt,
    shopperConfirmedAt,
    disputeStatus,
  });

  const showConfirmationSection = bookingPhase === 'ended_awaiting_confirmation' && !shopperConfirmedAt;

  const handlePayNow = async () => {
    if (!listing) return;

    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    // If we're in an iframe (Lovable preview), Stripe Checkout won't render in-frame.
    // Open a blank tab synchronously to avoid popup blockers, then navigate it once we have the URL.
    const checkoutWindow = isInIframe ? window.open('about:blank', '_blank') : null;

    setIsProcessingPayment(true);
    setShowPriceBreakdown(false);
    setShowCheckoutOverlay(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          booking_id: booking.id,
          listing_id: listing.id,
          mode: 'rent',
          amount: booking.total_price,
          delivery_fee: booking.delivery_fee_snapshot || 0,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data?.url) throw new Error('Failed to create checkout session');

      onPaymentInitiated?.();

      // Hide overlay since we're not navigating away when opening in a new tab.
      setShowCheckoutOverlay(false);

      if (checkoutWindow) {
        checkoutWindow.location.href = data.url;
        return;
      }

      if (isInIframe) {
        // Popup blocked: attempt to escape the iframe.
        try {
          window.top?.location.assign(data.url);
        } catch {
          window.location.assign(data.url);
        }
        return;
      }

      // Not in iframe: keep the smoother same-tab flow.
      window.location.href = data.url;
    } catch (error) {
      console.error('Payment error:', error);
      if (checkoutWindow) checkoutWindow.close();
      setShowCheckoutOverlay(false);
      toast({
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };
  return (
    <div className="overflow-hidden rounded-xl border-0 shadow-xl bg-card">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
          <img
            src={listing?.cover_image_url || '/placeholder.svg'}
            alt={listing?.title || 'Listing'}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <Link 
                to={`/listing/${listing?.id}`}
                className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
              >
                {listing?.title || 'Listing unavailable'}
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{location}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {isInstantBook && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Zap className="h-3 w-3" />
                  Instant Book
                </span>
              )}
              <StatusBadge status={booking.status} />
              <PaymentStatusBadge status={paymentStatus} />
            </div>
          </div>

          {/* Instant Book Timeline */}
          {isInstantBook && hasDocumentRequirements && (
            <div className="mb-3 bg-muted/30 rounded-lg px-3">
              <InstantBookTimeline
                isPaid={isPaid}
                documentsSubmitted={compliance.allSubmitted}
                documentsApproved={compliance.allApproved}
                documentsRejected={hasRejectedDocs}
                bookingConfirmed={bookingConfirmed}
                bookingCancelled={bookingCancelled}
              />
            </div>
          )}

          {/* Booking Phase Indicator - Show for approved bookings */}
          {isApproved && isPaid && (
            <div className="mb-3">
              <BookingPhaseIndicator
                startDate={booking.start_date}
                endDate={booking.end_date}
                status={booking.status}
                paymentStatus={paymentStatus}
                hostConfirmedAt={hostConfirmedAt}
                shopperConfirmedAt={shopperConfirmedAt}
                disputeStatus={disputeStatus}
              />
            </div>
          )}

          {/* Booking Details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-3">
            <div className="flex items-center gap-1.5 text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>
                {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
              </span>
            </div>
            {listing?.category && (
              <span className="text-muted-foreground">
                {CATEGORY_LABELS[listing.category]}
              </span>
            )}
            <span className="font-semibold text-primary">
              ${booking.total_price}
            </span>
          </div>

          {/* Fulfillment Info */}
          {booking.fulfillment_selected && (
            <div className="text-xs text-muted-foreground mb-3">
              <span className="capitalize">{booking.fulfillment_selected}</span>
              {booking.fulfillment_selected === 'delivery' && booking.delivery_address && (
                <span> • {booking.delivery_address}</span>
              )}
            </div>
          )}

          {/* Deposit Required Preview - Show when deposit configured but not yet paid */}
          {hasDeposit && !isPaid && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Shield className="h-3.5 w-3.5" />
              <span>${depositAmount?.toFixed(2)} security deposit required at checkout</span>
            </div>
          )}
          {hasDeposit && isPaid && (
            <div className={`rounded-lg p-3 mb-3 border ${
              depositStatus === 'refunded' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' :
              depositStatus === 'forfeited' ? 'bg-destructive/5 border-destructive/20' :
              depositStatus === 'charged' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' :
              'bg-muted/30 border-border'
            }`}>
              <div className="flex items-start gap-2">
                <Shield className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  depositStatus === 'refunded' ? 'text-emerald-600' :
                  depositStatus === 'forfeited' ? 'text-destructive' :
                  depositStatus === 'charged' ? 'text-blue-600' :
                  'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Security Deposit</span>
                    <span className="text-sm font-semibold">${depositAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {depositStatus === 'charged' && !rentalEnded && (
                      <>
                        <Shield className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-blue-600">Held until rental ends</span>
                      </>
                    )}
                    {depositStatus === 'charged' && rentalEnded && (
                      <>
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span className="text-xs text-amber-600">Pending release by host</span>
                      </>
                    )}
                    {depositStatus === 'refunded' && (
                      <>
                        <Undo2 className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs text-emerald-600 font-medium">Refunded to your account</span>
                      </>
                    )}
                    {depositStatus === 'forfeited' && (
                      <>
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <span className="text-xs text-destructive font-medium">Forfeited</span>
                      </>
                    )}
                  </div>
                  {depositRefundNotes && (depositStatus === 'refunded' || depositStatus === 'forfeited') && (
                    <p className="text-xs text-muted-foreground mt-1.5 bg-background/50 rounded px-2 py-1">
                      {depositRefundNotes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Host Response */}
          {booking.host_response && (
            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <p className="text-xs text-muted-foreground mb-1">Host response:</p>
              <p className="text-sm text-foreground">{booking.host_response}</p>
            </div>
          )}

          {/* Booking End Confirmation Section */}
          {showConfirmationSection && (
            <div className="mb-3">
              <BookingConfirmationSection
                bookingId={booking.id}
                isHost={false}
                hostConfirmedAt={hostConfirmedAt}
                shopperConfirmedAt={shopperConfirmedAt}
                disputeStatus={disputeStatus}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" asChild className="bg-card/80 backdrop-blur-sm">
              <Link to={`/listing/${listing?.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View Listing
              </Link>
            </Button>

            {canMessage && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMessageDialog(true)}
                className="bg-card/80 backdrop-blur-sm"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Message Host
              </Button>
            )}
            
            {/* Cancel button - show for pending OR approved with paid status */}
            {(isPending || (isApproved && isPaid)) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : null}
                    {isPaid ? 'Cancel & Refund' : 'Cancel Request'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isPaid ? 'Cancel Booking & Request Refund?' : 'Cancel Booking Request?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isPaid 
                        ? `Are you sure you want to cancel this booking? A refund of $${booking.total_price} will be processed and returned to your original payment method within 5-10 business days.`
                        : 'Are you sure you want to cancel this booking request? This action cannot be undone.'
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setIsCancelling(true);
                        try {
                          await onCancel(booking.id, 'Cancelled by guest');
                        } finally {
                          setIsCancelling(false);
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isPaid ? 'Cancel & Refund' : 'Cancel Request'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Pay Now / Retry Payment Button for approved unpaid or failed bookings */}
            {needsPayment && (
              <Button
                variant="dark-shine"
                size="sm"
                onClick={() => setShowPriceBreakdown(true)}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : paymentStatus === 'failed' ? (
                  <AlertCircle className="h-4 w-4 mr-1" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                {paymentStatus === 'failed' ? 'Retry Payment' : 'Pay Now'} · ${booking.total_price}
              </Button>
            )}

            {isApproved && isPaid && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 ml-auto">
                <CheckCircle2 className="h-3 w-3" />
                Paid & Confirmed
              </span>
            )}

            {isApproved && !isPaid && !needsPayment && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 ml-auto">
                <CheckCircle2 className="h-3 w-3" />
                Confirmed by host
              </span>
            )}

            {canReview && (
              <Button
                variant="dark-shine"
                size="sm"
                onClick={() => setShowReviewForm(true)}
              >
                <Star className="h-4 w-4 mr-1" />
                Leave Review
              </Button>
            )}

            {existingReview && (
              <span className="text-xs text-primary flex items-center gap-1 ml-auto">
                <Star className="h-3 w-3 fill-primary" />
                Reviewed
              </span>
            )}

            {/* Document upload toggle button */}
            {hasDocumentRequirements && (isPending || isApproved) && (
              <Collapsible open={showDocuments} onOpenChange={setShowDocuments}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant={needsDocuments || hasRejectedDocs ? 'default' : 'outline'}
                    size="sm"
                    className={needsDocuments || hasRejectedDocs ? 'bg-amber-500 hover:bg-amber-600' : ''}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {needsDocuments ? 'Upload Documents' : hasRejectedDocs ? 'Fix Documents' : 'View Documents'}
                    {showDocuments ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>

          {/* Document Upload Section (Collapsible) */}
          {hasDocumentRequirements && listingId && (isPending || isApproved) && (
            <Collapsible open={showDocuments} onOpenChange={setShowDocuments}>
              <CollapsibleContent>
                <div className="mt-4 pt-4 border-t border-border">
                  <DocumentUploadSection
                    listingId={listingId}
                    bookingId={booking.id}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Review Form */}
          {showReviewForm && listing && (
            <div className="mt-4 pt-4 border-t border-border">
              <ReviewForm
                bookingId={booking.id}
                listingId={listing.id}
                hostId={booking.host_id}
                onSuccess={() => setShowReviewForm(false)}
              />
            </div>
          )}
        </div>
      </div>

      <MessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        bookingId={booking.id}
        listingTitle={listing?.title || 'Booking'}
        otherPartyName="Host"
      />

      {/* Price Breakdown Modal */}
      <PriceBreakdownModal
        open={showPriceBreakdown}
        onOpenChange={setShowPriceBreakdown}
        mode="rent"
        basePrice={booking.total_price - (booking.delivery_fee_snapshot || 0)}
        deliveryFee={booking.delivery_fee_snapshot || 0}
        listingTitle={listing?.title}
        onConfirm={handlePayNow}
      />

      {/* Checkout Overlay */}
      <CheckoutOverlay isVisible={showCheckoutOverlay} />
    </div>
  );
};

export default ShopperBookingCard;
