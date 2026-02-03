import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Check,
  X,
  AlertTriangle,
  CalendarPlus,
  Loader2,
  Clock,
  Building2
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'booking_requests'>;
type Listing = Tables<'listings'>;

interface BookingDetailsDrawerProps {
  booking: Booking;
  listing: Listing;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  declined: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Request pending',
  approved: 'Approved',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

const PAYOUT_STATUS_TEXT: Record<string, string> = {
  pending: 'Pending – will be sent after check-in',
  scheduled: 'Scheduled',
  sent: 'Sent',
  held: 'Held until booking ends',
};

const BookingDetailsDrawer = ({ 
  booking, 
  listing, 
  open, 
  onClose, 
  onUpdate 
}: BookingDetailsDrawerProps) => {
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Calculate host payout (total minus platform fee)
  const platformFeePercent = 0.10; // 10% platform fee
  const hostPayout = booking.total_price ? booking.total_price * (1 - platformFeePercent) : 0;
  const platformFee = booking.total_price ? booking.total_price * platformFeePercent : 0;

  // Determine payout status
  const getPayoutStatus = () => {
    if (booking.status === 'completed') return 'sent';
    if (booking.payment_status === 'paid' && booking.status === 'approved') return 'scheduled';
    return 'pending';
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: 'Booking approved',
        description: 'The renter has been notified.',
      });
      onUpdate();
    } catch (error) {
      console.error('Error approving booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: 'Booking declined',
        description: 'The renter has been notified.',
      });
      onUpdate();
    } catch (error) {
      console.error('Error declining booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeclining(false);
    }
  };

  const handleMarkCompleted = async () => {
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: 'Booking completed',
        description: 'The booking has been marked as completed.',
      });
      onUpdate();
    } catch (error) {
      console.error('Error completing booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(booking.start_date);
    const endDate = booking.end_date ? new Date(booking.end_date) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const event = {
      title: `Booking: ${listing.title}`,
      description: `Rental booking for ${listing.title}.\n\nLocation: ${listing.address || listing.pickup_location_text || 'See listing'}\n\nBooking ID: ${booking.id}`,
      location: listing.address || listing.pickup_location_text || '',
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };

    // Create ICS file content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Vendibook//Booking Calendar//EN
BEGIN:VEVENT
DTSTART:${event.startDate}
DTEND:${event.endDate}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

    // Download the ICS file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.id.slice(0, 8)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Calendar event downloaded',
      description: 'Open the file to add it to your calendar.',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <SheetTitle>Booking details</SheetTitle>
            <Badge className={STATUS_COLORS[booking.status]}>
              {STATUS_LABELS[booking.status]}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Renter
            </h3>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="font-medium text-foreground">
                {(booking as Booking & { renter_name?: string }).renter_name || 'Guest'}
              </p>
              {(booking as Booking & { renter_business_name?: string }).renter_business_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" />
                  {(booking as Booking & { renter_business_name?: string }).renter_business_name}
                </p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                asChild
              >
                <Link to={`/messages?booking=${booking.id}`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message renter
                </Link>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Dates Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </h3>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Check-in</span>
                <span className="font-medium">
                  {new Date(booking.start_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              {booking.end_date && booking.end_date !== booking.start_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Check-out</span>
                  <span className="font-medium">
                    {new Date(booking.end_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment
            </h3>
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="font-medium">${booking.total_price?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Platform fee (10%)</span>
                <span className="text-sm">-${platformFee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Your payout</span>
                <span className="font-bold text-emerald-600">${hostPayout.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {PAYOUT_STATUS_TEXT[getPayoutStatus()]}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            {/* Pending actions */}
            {booking.status === 'pending' && (
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="dark-shine" 
                  onClick={handleApprove}
                  disabled={isApproving || isDeclining}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDecline}
                  disabled={isApproving || isDeclining}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  {isDeclining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Decline
                </Button>
              </div>
            )}

            {/* Mark completed (for paid bookings that have ended) */}
            {booking.status === 'approved' && booking.payment_status === 'paid' && new Date(booking.end_date || booking.start_date) < new Date() && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleMarkCompleted}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Mark completed
              </Button>
            )}

            {/* Add to Calendar */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleAddToCalendar}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Add to your calendar
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Saves this booking to your phone calendar.
            </p>

            {/* Report issue */}
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              asChild
            >
              <Link to="/help">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report an issue
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BookingDetailsDrawer;
