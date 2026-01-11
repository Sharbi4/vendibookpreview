import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Calendar, ArrowRight, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';

interface BookingDetails {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  listing: {
    title: string;
    cover_image_url: string | null;
  } | null;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch booking by checkout session ID
        const { data, error } = await supabase
          .from('booking_requests')
          .select(`
            id,
            start_date,
            end_date,
            total_price,
            listing:listings(title, cover_image_url)
          `)
          .eq('checkout_session_id', sessionId)
          .single();

        if (!error && data) {
          setBooking(data as unknown as BookingDetails);
        }
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container max-w-lg">
          <Card className="border-2 border-emerald-200 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Confirming your payment...</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Payment Successful!
                  </h1>
                  
                  <p className="text-muted-foreground mb-6">
                    Your booking has been confirmed and payment processed.
                  </p>

                  {booking && (
                    <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
                      <div className="flex gap-4">
                        {booking.listing?.cover_image_url && (
                          <img
                            src={booking.listing.cover_image_url}
                            alt={booking.listing?.title || 'Listing'}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {booking.listing?.title || 'Your Booking'}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(booking.start_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })} - {new Date(booking.end_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="font-semibold text-primary mt-2">
                            ${booking.total_price.toFixed(2)} paid
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button asChild className="w-full" size="lg">
                      <Link to="/dashboard">
                        View My Bookings
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/">
                        <Home className="mr-2 h-4 w-4" />
                        Back to Home
                      </Link>
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-6">
                    A confirmation email has been sent to your email address.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
