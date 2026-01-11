import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
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
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useBookingReview } from '@/hooks/useReviews';
import { useDocumentComplianceStatus } from '@/hooks/useRequiredDocuments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS } from '@/types/listing';
import type { ShopperBooking } from '@/hooks/useShopperBookings';

interface ShopperBookingCardProps {
  booking: ShopperBooking;
  onCancel: (id: string) => void;
  onPaymentInitiated?: () => void;
}

const StatusBadge = ({ status }: { status: ShopperBooking['status'] }) => {
  const config = {
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    declined: {
      label: 'Declined',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-red-200',
    },
    cancelled: {
      label: 'Cancelled',
      icon: X,
      className: 'bg-muted text-muted-foreground border-border',
    },
    completed: {
      label: 'Completed',
      icon: CheckCircle2,
      className: 'bg-blue-100 text-blue-700 border-blue-200',
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
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    paid: {
      label: 'Paid',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    failed: {
      label: 'Payment Failed',
      className: 'bg-red-100 text-red-700 border-red-200',
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

  const handlePayNow = async () => {
    if (!listing) return;
    
    setIsProcessingPayment(true);
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

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        toast({
          title: 'Checkout opened',
          description: 'Complete your payment in the new tab.',
        });
        onPaymentInitiated?.();
      }
    } catch (error) {
      console.error('Payment error:', error);
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
    <div className="bg-card border border-border rounded-xl overflow-hidden">
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
              <StatusBadge status={booking.status} />
              <PaymentStatusBadge status={paymentStatus} />
            </div>
          </div>

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

          {/* Host Response */}
          {booking.host_response && (
            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <p className="text-xs text-muted-foreground mb-1">Host response:</p>
              <p className="text-sm text-foreground">{booking.host_response}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" asChild>
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
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Message Host
              </Button>
            )}
            
            {isPending && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    Cancel Request
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Booking Request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this booking request? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onCancel(booking.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Pay Now Button for approved unpaid bookings */}
            {needsPayment && (
              <Button
                variant="default"
                size="sm"
                onClick={handlePayNow}
                disabled={isProcessingPayment}
                className="bg-primary hover:bg-primary/90"
              >
                {isProcessingPayment ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                Pay Now · ${booking.total_price}
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
                variant="default"
                size="sm"
                onClick={() => setShowReviewForm(true)}
                className="ml-auto"
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
    </div>
  );
};

export default ShopperBookingCard;
