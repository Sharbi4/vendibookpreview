import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Calendar, ArrowRight, Loader2, Home, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useCreateSaleTransaction } from '@/hooks/useSaleTransactions';

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

interface SaleTransactionDetails {
  id: string;
  amount: number;
  listing: {
    title: string;
    cover_image_url: string | null;
  } | null;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isEscrow = searchParams.get('escrow') === 'true';
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [saleTransaction, setSaleTransaction] = useState<SaleTransactionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const createSaleTransaction = useCreateSaleTransaction();

  useEffect(() => {
    const processPayment = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        if (isEscrow) {
          // Handle escrow sale - create the transaction record
          const result = await createSaleTransaction.mutateAsync(sessionId);
          
          if (result.transaction_id) {
            // Fetch the transaction details
            const { data, error: txError } = await (supabase
              .from('sale_transactions' as any)
              .select(`
                id,
                amount,
                listing:listings(title, cover_image_url)
              `)
              .eq('id', result.transaction_id)
              .maybeSingle()) as any;

            if (!txError && data) {
              setSaleTransaction(data as SaleTransactionDetails);
            }
          }
        } else {
          // Handle regular booking
          const { data, error: bookingError } = await supabase
            .from('booking_requests')
            .select(`
              id,
              start_date,
              end_date,
              total_price,
              listing:listings(title, cover_image_url)
            `)
            .eq('checkout_session_id', sessionId)
            .maybeSingle();

          if (!bookingError && data) {
            setBooking(data as unknown as BookingDetails);
          }
        }
      } catch (err) {
        console.error('Error processing payment:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    processPayment();
  }, [sessionId, isEscrow]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container max-w-lg">
          <Card className="border-2 border-foreground shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    {isEscrow ? 'Setting up your escrow purchase...' : 'Confirming your payment...'}
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                  <p className="text-muted-foreground">{error}</p>
                  <Button asChild className="mt-4">
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              ) : isEscrow ? (
                // Escrow Sale Success
                <>
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="h-10 w-10 text-emerald-600" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Purchase in Escrow!
                  </h1>
                  
                  <p className="text-muted-foreground mb-6">
                    Your payment is securely held until both you and the seller confirm the transaction.
                  </p>

                  {saleTransaction && (
                    <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
                      <div className="flex gap-4">
                        {saleTransaction.listing?.cover_image_url && (
                          <img
                            src={saleTransaction.listing.cover_image_url}
                            alt={saleTransaction.listing?.title || 'Item'}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {saleTransaction.listing?.title || 'Your Purchase'}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-amber-600 mt-1">
                            <Clock className="h-4 w-4" />
                            <span>Awaiting confirmation</span>
                          </div>
                          <p className="font-semibold text-primary mt-2">
                            ${saleTransaction.amount.toLocaleString()} in escrow
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Escrow Process Steps */}
                  <div className="bg-muted/30 rounded-xl p-4 mb-6 text-left">
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What happens next?</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Payment Secured</p>
                          <p className="text-xs text-muted-foreground">Your funds are safely held in escrow</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-amber-600">2</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Receive Your Item</p>
                          <p className="text-xs text-muted-foreground">Coordinate with the seller to receive your purchase</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">3</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Confirm Receipt</p>
                          <p className="text-xs text-muted-foreground">Once you have the item, confirm in your dashboard</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">4</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Payment Released</p>
                          <p className="text-xs text-muted-foreground">After both parties confirm, funds go to the seller</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button asChild className="w-full" size="lg">
                      <Link to="/dashboard">
                        Go to My Purchases
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/">
                        <Home className="mr-2 h-4 w-4" />
                        Continue Browsing
                      </Link>
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-6">
                    You can track and confirm your purchase from your dashboard.
                  </p>
                </>
              ) : (
                // Regular Booking Success
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
