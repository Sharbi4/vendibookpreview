import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-amber-200/30 via-orange-100/25 to-rose-200/20">
      {/* Decorative orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-amber-400/25 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-rose-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-300/15 rounded-full blur-3xl" />
      </div>
      
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16 relative z-10">
        <div className="container max-w-lg">
          <Card className="border-2 border-amber-300/50 shadow-xl backdrop-blur-sm bg-background/95">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-amber-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Payment Cancelled
              </h1>
              
              <p className="text-muted-foreground mb-6">
                Your payment was cancelled. Don't worry - your booking request is still active 
                and you can complete payment anytime.
              </p>

              <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-medium text-foreground mb-2">What happens now?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Your booking request remains active
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    You can complete payment from your dashboard
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    The host will be notified once payment is complete
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button asChild className="w-full" size="lg">
                  <Link to="/dashboard">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Go to Dashboard to Pay
                  </Link>
                </Button>
                
                {listingId && (
                  <Button variant="outline" asChild className="w-full">
                    <Link to={`/listing/${listingId}`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Return to Listing
                    </Link>
                  </Button>
                )}

                <Button variant="ghost" asChild className="w-full">
                  <Link to="/contact">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Need Help?
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentCancelled;
