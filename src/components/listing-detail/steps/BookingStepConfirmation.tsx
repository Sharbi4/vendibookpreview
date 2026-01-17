import { CheckCircle2, Calendar, MessageCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BookingStepConfirmationProps {
  instantBook: boolean;
  bookingId: string | null;
  listingTitle: string;
}

const BookingStepConfirmation = ({
  instantBook,
  bookingId,
  listingTitle,
}: BookingStepConfirmationProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card text-center">
      {/* Success icon */}
      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {instantBook ? "You're booked!" : 'Request sent!'}
      </h3>

      {/* Body */}
      <p className="text-muted-foreground mb-6">
        {instantBook
          ? 'Check messages for pickup/delivery details.'
          : 'The host will respond within 24-48 hours.'}
      </p>

      {/* Primary CTA */}
      <Button variant="gradient" asChild className="w-full mb-3">
        <Link to="/dashboard">
          <Calendar className="h-4 w-4 mr-2" />
          View booking
        </Link>
      </Button>

      {/* Secondary actions */}
      <div className="flex gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link to="/messages">
            <MessageCircle className="h-4 w-4 mr-2" />
            Message host
          </Link>
        </Button>
        <Button variant="ghost" asChild className="flex-1">
          <Link to="/search">
            Keep browsing
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default BookingStepConfirmation;
