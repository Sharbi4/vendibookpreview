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
  MessageCircle
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
import { MessageDialog } from '@/components/messaging/MessageDialog';
import { CATEGORY_LABELS } from '@/types/listing';
import type { ShopperBooking } from '@/hooks/useShopperBookings';

interface ShopperBookingCardProps {
  booking: ShopperBooking;
  onCancel: (id: string) => void;
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

const ShopperBookingCard = ({ booking, onCancel }: ShopperBookingCardProps) => {
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const listing = booking.listing;
  const location = listing?.address || listing?.pickup_location_text || 'Location TBD';
  const isPending = booking.status === 'pending';
  const isApproved = booking.status === 'approved';
  const canMessage = booking.status !== 'cancelled' && booking.status !== 'declined';
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
            <StatusBadge status={booking.status} />
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

            {isApproved && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 ml-auto">
                <CheckCircle2 className="h-3 w-3" />
                Confirmed by host
              </span>
            )}
          </div>
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
