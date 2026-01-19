import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Calendar, ArrowRight, Loader2, Home, ShieldCheck, Clock, Sparkles, PartyPopper, Mail, ChevronDown, ChevronUp, Receipt, Download, FileText, Printer, Wallet, BanknoteIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useCreateSaleTransaction } from '@/hooks/useSaleTransactions';
import { EmailReceiptPreview } from '@/components/checkout';
import { useAuth } from '@/contexts/AuthContext';
import { calculateRentalFees } from '@/lib/commissions';
import { generateReceiptPdf } from '@/lib/generateReceiptPdf';

interface BookingDetails {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  delivery_fee_snapshot?: number;
  address_snapshot?: string;
  fulfillment_selected?: string;
  listing: {
    title: string;
    cover_image_url: string | null;
  } | null;
}

interface SaleTransactionDetails {
  id: string;
  amount: number;
  platform_fee: number;
  delivery_fee?: number;
  delivery_address?: string;
  fulfillment_type?: string;
  listing: {
    title: string;
    cover_image_url: string | null;
  } | null;
}

interface TaxBreakdown {
  amount: number;
  rate: string;
  percentage: number;
  jurisdiction: string;
  tax_type: string;
}

interface CheckoutSessionInfo {
  subtotal: number;
  tax_total: number;
  total: number;
  taxes: TaxBreakdown[];
  billing_state: string | null;
  currency: string;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isEscrow = searchParams.get('escrow') === 'true';
  const { user } = useAuth();
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [saleTransaction, setSaleTransaction] = useState<SaleTransactionDetails | null>(null);
  const [sessionInfo, setSessionInfo] = useState<CheckoutSessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const confettiFired = useRef(false);
  
  const createSaleTransaction = useCreateSaleTransaction();

  // Fire confetti on success
  const fireConfetti = () => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FF5124', '#FFB800', '#22C55E', '#3B82F6', '#A855F7'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FF5124', '#FFB800', '#22C55E', '#3B82F6', '#A855F7'],
      });
    }, 250);
  };

  useEffect(() => {
    const processPayment = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        if (isEscrow) {
          const result = await createSaleTransaction.mutateAsync(sessionId);
          
          if (result.transaction_id) {
            const { data, error: txError } = await (supabase
              .from('sale_transactions' as any)
              .select(`
                id,
                amount,
                platform_fee,
                delivery_fee,
                delivery_address,
                fulfillment_type,
                listing:listings(title, cover_image_url)
              `)
              .eq('id', result.transaction_id)
              .maybeSingle()) as any;

            if (!txError && data) {
              setSaleTransaction(data as SaleTransactionDetails);
            }
          }
        } else {
          const { data, error: bookingError } = await supabase
            .from('booking_requests')
            .select(`
              id,
              start_date,
              end_date,
              total_price,
              delivery_fee_snapshot,
              address_snapshot,
              fulfillment_selected,
              listing:listings(title, cover_image_url)
            `)
            .eq('checkout_session_id', sessionId)
            .maybeSingle();

          if (!bookingError && data) {
            setBooking(data as unknown as BookingDetails);
          }
        }

        // Fetch user profile for email preview
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile) {
            setUserProfile(profile);
          }
        }

        // Fetch checkout session details for tax breakdown
        if (sessionId) {
          try {
            const { data: sessionData, error: sessionError } = await supabase.functions.invoke('get-checkout-session', {
              body: { session_id: sessionId }
            });
            
            if (!sessionError && sessionData) {
              setSessionInfo(sessionData as CheckoutSessionInfo);
            }
          } catch (taxErr) {
            console.error('Error fetching tax info:', taxErr);
            // Non-critical error, continue without tax breakdown
          }
        }
      } catch (err) {
        console.error('Error processing payment:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
        // Trigger confetti and content reveal
        setTimeout(() => {
          setShowContent(true);
          fireConfetti();
        }, 300);
      }
    };

    processPayment();
  }, [sessionId, isEscrow, user]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-emerald-200/30 via-teal-100/25 to-cyan-200/20">
      {/* Decorative orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-400/25 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-300/15 rounded-full blur-3xl" />
        <div className="absolute top-10 left-1/4 w-64 h-64 bg-emerald-300/20 rounded-full blur-2xl" />
      </div>
      
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16 relative z-10">
        <div className="container max-w-2xl">
          <Card className={`border-2 shadow-xl overflow-hidden transition-all duration-500 backdrop-blur-sm bg-background/95 ${showContent && !isLoading && !error ? 'border-emerald-500' : 'border-foreground/20'}`}>
            <CardContent className="pt-8 pb-8 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <div className="relative w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {isEscrow ? 'Setting up your escrow purchase...' : 'Confirming your payment...'}
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-4 animate-fade-in">
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
                <div className={`transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-emerald-200 rounded-full animate-pulse" />
                    <div className="absolute inset-2 bg-emerald-100 rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck className="h-12 w-12 text-emerald-600" />
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500 animate-bounce" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <PartyPopper className="h-6 w-6 text-primary" />
                    Purchase in Escrow!
                    <PartyPopper className="h-6 w-6 text-primary transform scale-x-[-1]" />
                  </h1>
                  
                  <p className="text-muted-foreground mb-6">
                    Your payment is securely held until both you and the seller confirm the transaction.
                  </p>

                  {saleTransaction && (
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl p-4 mb-6 text-left border border-emerald-200 dark:border-emerald-800">
                      <div className="flex gap-4">
                        {saleTransaction.listing?.cover_image_url && (
                          <img
                            src={saleTransaction.listing.cover_image_url}
                            alt={saleTransaction.listing?.title || 'Item'}
                            className="w-20 h-20 rounded-lg object-cover shadow-md"
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
                          <p className="font-bold text-lg text-emerald-600 mt-2">
                            ${saleTransaction.amount.toLocaleString()} secured
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tax Breakdown */}
                  {sessionInfo && sessionInfo.tax_total > 0 && (
                    <Collapsible open={showTaxBreakdown} onOpenChange={setShowTaxBreakdown} className="mb-6">
                      <div className="bg-muted/30 rounded-xl p-4 text-left border border-border">
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm text-foreground">Payment Summary</span>
                            </div>
                            {showTaxBreakdown ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground">${sessionInfo.subtotal.toFixed(2)}</span>
                          </div>
                          
                          <CollapsibleContent>
                            {sessionInfo.taxes.length > 0 && (
                              <div className="space-y-1.5 py-2">
                                {sessionInfo.taxes.map((tax, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {tax.jurisdiction} {tax.rate} ({tax.percentage.toFixed(2)}%)
                                    </span>
                                    <span className="text-foreground">${tax.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CollapsibleContent>
                          
                          <div className="flex justify-between text-amber-600">
                            <span>Tax{sessionInfo.billing_state ? ` (${sessionInfo.billing_state})` : ''}</span>
                            <span>${sessionInfo.tax_total.toFixed(2)}</span>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="flex justify-between font-semibold">
                            <span className="text-foreground">Total Paid</span>
                            <span className="text-emerald-600">${sessionInfo.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </Collapsible>
                  )}

                  {/* Escrow Process Steps */}
                  <div className="bg-muted/30 rounded-xl p-4 mb-4 text-left">
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What happens next?</h4>
                    <div className="space-y-3">
                      {[
                        { done: true, title: 'Payment Secured', desc: 'Your funds are safely held in escrow' },
                        { done: false, step: 2, title: 'Receive Your Item', desc: 'Coordinate with the seller' },
                        { done: false, step: 3, title: 'Confirm Receipt', desc: 'Verify in your dashboard' },
                        { done: false, step: 4, title: 'Payment Released', desc: 'Funds go to the seller' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-100' : 'bg-muted'}`}>
                            {item.done ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <span className={`text-xs font-bold ${item.step === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>{item.step}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seller Payout Timeline */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl p-4 mb-6 text-left border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <BanknoteIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                          Seller Payout Timeline
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Funds will be released to the seller within <span className="font-medium text-blue-600 dark:text-blue-400">2-3 business days</span> after you confirm receipt. The seller will receive their payout minus the 12.9% platform fee.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        if (saleTransaction) {
                          generateReceiptPdf({
                            transactionId: saleTransaction.id,
                            itemName: saleTransaction.listing?.title || 'Your Purchase',
                            amount: saleTransaction.amount,
                            platformFee: saleTransaction.platform_fee,
                            deliveryFee: saleTransaction.delivery_fee,
                            isRental: false,
                            isEscrow: true,
                            fulfillmentType: saleTransaction.fulfillment_type,
                            address: saleTransaction.delivery_address,
                            paymentDate: new Date().toISOString(),
                            recipientName: userProfile?.full_name || 'Valued Customer',
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download Receipt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Button asChild className="w-full bg-primary hover:bg-primary/90" size="lg">
                      <Link to="/transactions?tab=purchases">
                        View My Purchases
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

                  <Collapsible open={showEmailPreview} onOpenChange={setShowEmailPreview} className="mt-6">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-foreground">
                        <Mail className="h-4 w-4" />
                        {showEmailPreview ? 'Hide' : 'Preview'} Receipt Email
                        {showEmailPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      {saleTransaction && (
                        <EmailReceiptPreview
                          transactionId={saleTransaction.id}
                          itemName={saleTransaction.listing?.title || 'Your Purchase'}
                          amount={saleTransaction.amount}
                          platformFee={saleTransaction.platform_fee}
                          deliveryFee={saleTransaction.delivery_fee}
                          isRental={false}
                          address={saleTransaction.delivery_address}
                          fulfillmentType={saleTransaction.fulfillment_type}
                          isEscrow={true}
                          paymentMethod="Card ending in ****"
                          paymentDate={new Date().toISOString()}
                          recipientName={userProfile?.full_name || 'Valued Customer'}
                          recipientEmail={userProfile?.email || user?.email}
                        />
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <p className="text-xs text-muted-foreground mt-4">
                    You can track and confirm your purchase from your dashboard.
                  </p>
                </div>
              ) : (
                // Regular Booking Success
                <div className={`transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-emerald-200 rounded-full animate-pulse" />
                    <div className="absolute inset-2 bg-emerald-100 rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500 animate-bounce" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <PartyPopper className="h-6 w-6 text-primary" />
                    Payment Successful!
                    <PartyPopper className="h-6 w-6 text-primary transform scale-x-[-1]" />
                  </h1>
                  
                  <p className="text-muted-foreground mb-6">
                    Your booking has been confirmed and payment processed.
                  </p>

                  {booking && (
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 mb-6 text-left border border-primary/20">
                      <div className="flex gap-4">
                        {booking.listing?.cover_image_url && (
                          <img
                            src={booking.listing.cover_image_url}
                            alt={booking.listing?.title || 'Listing'}
                            className="w-20 h-20 rounded-lg object-cover shadow-md"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {booking.listing?.title || 'Your Booking'}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4 text-primary" />
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
                          <p className="font-bold text-lg text-primary mt-2">
                            ${booking.total_price.toFixed(2)} paid
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tax Breakdown for Rentals */}
                  {sessionInfo && sessionInfo.tax_total > 0 && (
                    <Collapsible open={showTaxBreakdown} onOpenChange={setShowTaxBreakdown} className="mb-6">
                      <div className="bg-muted/30 rounded-xl p-4 text-left border border-border">
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm text-foreground">Payment Summary</span>
                            </div>
                            {showTaxBreakdown ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </CollapsibleTrigger>
                        
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground">${sessionInfo.subtotal.toFixed(2)}</span>
                          </div>
                          
                          <CollapsibleContent>
                            {sessionInfo.taxes.length > 0 && (
                              <div className="space-y-1.5 py-2">
                                {sessionInfo.taxes.map((tax, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {tax.jurisdiction} {tax.rate} ({tax.percentage.toFixed(2)}%)
                                    </span>
                                    <span className="text-foreground">${tax.amount.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CollapsibleContent>
                          
                          <div className="flex justify-between text-amber-600">
                            <span>Tax{sessionInfo.billing_state ? ` (${sessionInfo.billing_state})` : ''}</span>
                            <span>${sessionInfo.tax_total.toFixed(2)}</span>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="flex justify-between font-semibold">
                            <span className="text-foreground">Total Paid</span>
                            <span className="text-primary">${sessionInfo.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </Collapsible>
                  )}

                  {/* Host Payout Timeline for Rentals */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl p-4 mb-6 text-left border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <BanknoteIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                          Host Payout Timeline
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your host will receive their payout within <span className="font-medium text-blue-600 dark:text-blue-400">2-3 business days</span> after the booking begins. Payouts are processed automatically via Stripe.
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-muted-foreground">You paid: <span className="font-medium text-foreground">${booking?.total_price?.toFixed(2) || '—'}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-muted-foreground">Platform fee: <span className="font-medium text-foreground">12.9%</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions for Rentals */}
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        if (booking) {
                          const fees = calculateRentalFees(
                            booking.total_price - (booking.delivery_fee_snapshot || 0),
                            booking.delivery_fee_snapshot || 0
                          );
                          generateReceiptPdf({
                            transactionId: booking.id,
                            itemName: booking.listing?.title || 'Your Booking',
                            amount: booking.total_price,
                            platformFee: fees.renterFee,
                            deliveryFee: booking.delivery_fee_snapshot,
                            isRental: true,
                            startDate: booking.start_date,
                            endDate: booking.end_date,
                            address: booking.address_snapshot,
                            fulfillmentType: booking.fulfillment_selected,
                            paymentDate: new Date().toISOString(),
                            recipientName: userProfile?.full_name || 'Valued Customer',
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download Receipt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Button asChild className="w-full bg-primary hover:bg-primary/90" size="lg">
                      <Link to="/transactions?tab=bookings">
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

                  <Collapsible open={showEmailPreview} onOpenChange={setShowEmailPreview} className="mt-6">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-foreground">
                        <Mail className="h-4 w-4" />
                        {showEmailPreview ? 'Hide' : 'Preview'} Receipt Email
                        {showEmailPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      {booking && (() => {
                        const fees = calculateRentalFees(
                          booking.total_price - (booking.delivery_fee_snapshot || 0),
                          booking.delivery_fee_snapshot || 0
                        );
                        return (
                          <EmailReceiptPreview
                            transactionId={booking.id}
                            itemName={booking.listing?.title || 'Your Booking'}
                            amount={booking.total_price}
                            platformFee={fees.renterFee}
                            deliveryFee={booking.delivery_fee_snapshot}
                            isRental={true}
                            startDate={booking.start_date}
                            endDate={booking.end_date}
                            address={booking.address_snapshot}
                            fulfillmentType={booking.fulfillment_selected}
                            isEscrow={false}
                            paymentMethod="Card ending in ****"
                            paymentDate={new Date().toISOString()}
                            recipientName={userProfile?.full_name || 'Valued Customer'}
                            recipientEmail={userProfile?.email || user?.email}
                          />
                        );
                      })()}
                    </CollapsibleContent>
                  </Collapsible>

                  <p className="text-xs text-muted-foreground mt-4">
                    A confirmation email has been sent to your email address.
                  </p>
                </div>
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
