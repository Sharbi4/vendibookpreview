import { CheckCircle2, Calendar, MessageCircle, ArrowRight, Clock, ShieldCheck, Sparkles, PartyPopper, FileText, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';

interface BookingStepConfirmationProps {
  instantBook: boolean;
  bookingId: string | null;
  listingTitle: string;
  listingId?: string;
}

const BookingStepConfirmation = ({
  instantBook,
  bookingId,
  listingTitle,
  listingId,
}: BookingStepConfirmationProps) => {
  const confettiFired = useRef(false);
  const { data: requiredDocuments } = useListingRequiredDocuments(listingId);
  const hasDocuments = requiredDocuments && requiredDocuments.length > 0;

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    // Fire confetti celebration
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 40 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.2, 0.8), y: Math.random() - 0.2 },
        colors: ['#FF5124', '#FFB800', '#22C55E', '#3B82F6', '#A855F7'],
      });
    }, 250);
  }, []);

  return (
    <div className="rounded-2xl border-0 shadow-xl bg-card overflow-hidden">
      {/* Success Header */}
      <div className="pt-8 pb-6 px-6 text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 bg-emerald-200 dark:bg-emerald-900/50 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 animate-bounce" />
        </div>

        <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <PartyPopper className="h-5 w-5 text-primary" />
          {instantBook ? "You're Booked!" : 'Request Sent!'}
          <PartyPopper className="h-5 w-5 text-primary transform scale-x-[-1]" />
        </h3>

        <p className="text-muted-foreground max-w-sm mx-auto">
          {instantBook
            ? 'Your booking is confirmed. Check messages for next steps.'
            : 'The host will review your request and respond within 24-48 hours.'}
        </p>
      </div>

      {/* What Happens Next */}
      <div className="px-6 pb-6">
        <div className="bg-muted/50 rounded-xl p-4 mb-6">
          <h4 className="font-semibold text-foreground text-sm mb-3">What happens next?</h4>
          <div className="space-y-3">
            {instantBook ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Booking Confirmed</p>
                    <p className="text-xs text-muted-foreground">Your dates are secured</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-amber-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Check Messages</p>
                    <p className="text-xs text-muted-foreground">Get pickup/delivery details from host</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Enjoy Your Rental</p>
                    <p className="text-xs text-muted-foreground">Arrive on your start date</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Request Submitted</p>
                    <p className="text-xs text-muted-foreground">Host has been notified</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Await Host Response</p>
                    <p className="text-xs text-muted-foreground">Usually within 24-48 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Complete Payment</p>
                    <p className="text-xs text-muted-foreground">If approved, you'll pay to confirm</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Documents Required Section */}
        {hasDocuments && instantBook && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Documents Required</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Please upload the following documents to complete your booking
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {requiredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-white dark:bg-card rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-900/30"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-sm font-medium text-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </span>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">Required</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 p-2.5 bg-white/50 dark:bg-card/50 rounded-lg border border-amber-100 dark:border-amber-900/30 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Documents are reviewed by our team and typically approved within <strong className="text-foreground">30 minutes</strong>. 
                You'll receive a notification once approved.
              </p>
            </div>

            <Button variant="outline" asChild className="w-full border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20">
              <Link to="/dashboard">
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents Now
              </Link>
            </Button>
          </div>
        )}

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6 p-3 bg-muted/30 rounded-lg border border-border">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Protected by VendiBook's Booking Guarantee</span>
        </div>

        {/* Primary CTA */}
        <Button variant="gradient" asChild className="w-full h-12 text-base mb-3">
          <Link to="/dashboard">
            <Calendar className="h-4 w-4 mr-2" />
            View My Booking
          </Link>
        </Button>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link to="/messages">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message Host
            </Link>
          </Button>
          <Button variant="ghost" asChild className="flex-1">
            <Link to="/search">
              Keep Browsing
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingStepConfirmation;