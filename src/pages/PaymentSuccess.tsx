import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Calendar, ArrowRight, Loader2, Home, ShieldCheck, Clock, Sparkles, PartyPopper, Mail, ChevronDown, ChevronUp, Receipt, Download, FileText, Printer, Wallet, BanknoteIcon, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';

import { EmailReceiptPreview } from '@/components/checkout';
import { useAuth } from '@/contexts/AuthContext';
import { calculateRentalFees } from '@/lib/commissions';
import { generateReceiptPdf } from '@/lib/generateReceiptPdf';
import { trackGA4Purchase } from '@/lib/ga4Conversions';
import { trackCheckoutConversion } from '@/lib/gtagConversions';

interface HourlySlotData {
  date: string;
  slots: string[];
}

interface BookingDetails {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  delivery_fee_snapshot?: number;
  address_snapshot?: string;
  fulfillment_selected?: string;
  is_instant_book?: boolean;
  status?: string;
  is_hourly_booking?: boolean;
  hourly_slots?: HourlySlotData[] | null;
  duration_hours?: number | null;
  start_time?: string | null;
  end_time?: string | null;
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
  const isHold = searchParams.get('hold') === 'true';
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
          // First, try to create the transaction via edge function
          // This handles the case where webhook hasn't fired or user returns before it processes
          // The edge function is idempotent - if transaction exists, it returns success
          try {
            await supabase.functions.invoke('create-sale-transaction', {
              body: { session_id: sessionId },
            });
          } catch (createError) {
            // Log but don't fail - transaction might already exist from webhook
            console.log('Create transaction attempt:', createError);
          }

          // Now poll for the transaction (should exist after create call or from webhook)
          let attempts = 0;
          const maxAttempts = 10;
          let transactionFound = false;
          
          while (attempts < maxAttempts && !transactionFound) {
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
              .eq('checkout_session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()) as any;

            if (!txError && data) {
              transactionFound = true;
              setSaleTransaction(data as SaleTransactionDetails);
              
              // Track GA4 purchase conversion for escrow sale
              trackGA4Purchase({
                transaction_id: data.id,
                value: data.amount,
                currency: 'USD',
                items: [{
                  item_id: data.id,
                  item_name: data.listing?.title || 'Purchase',
                  item_category: 'sale',
                  price: data.amount,
                  quantity: 1,
                }],
              });
              trackCheckoutConversion({
                transaction_id: data.id,
                value: data.amount,
                currency: 'USD',
              });
            } else {
              if (txError) {
                console.warn('PaymentSuccess: sale transaction lookup error', txError);
              }
              // Wait before retrying
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
          
          if (!transactionFound) {
            throw new Error('Transaction not found. Please check your purchases in the dashboard.');
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
              is_instant_book,
              status,
              is_hourly_booking,
              hourly_slots,
              duration_hours,
              start_time,
              end_time,
              listing:listings(title, cover_image_url)
            `)
            .eq('checkout_session_id', sessionId)
            .maybeSingle();

          if (!bookingError && data) {
            setBooking(data as unknown as BookingDetails);
            
            // Track GA4 purchase conversion for rental booking
            trackGA4Purchase({
              transaction_id: data.id,
              value: data.total_price,
              currency: 'USD',
              items: [{
                item_id: data.id,
                item_name: data.listing?.title || 'Booking',
                item_category: 'rental',
                price: data.total_price,
                quantity: 1,
              }],
            });
            trackCheckoutConversion({
              transaction_id: data.id,
              value: data.total_price,
              currency: 'USD',
            });
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
                // Regular Booking Success or Hold
                <div className={`transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {/* Order Number Banner */}
                  {booking && (
                    <div className="bg-muted/50 border border-border rounded-lg px-4 py-2 mb-4 inline-block">
                      <p className="text-xs text-muted-foreground">Order Number</p>
                      <p className="font-mono font-bold text-lg text-foreground">VB-{booking.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  )}

                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className={`absolute inset-0 ${booking?.is_instant_book ? 'bg-emerald-200' : isHold ? 'bg-amber-200' : 'bg-emerald-200'} rounded-full animate-pulse`} />
                    <div className={`absolute inset-2 ${booking?.is_instant_book ? 'bg-emerald-100' : isHold ? 'bg-amber-100' : 'bg-emerald-100'} rounded-full`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {booking?.is_instant_book ? (
                        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                      ) : isHold ? (
                        <Clock className="h-12 w-12 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                      )}
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500 animate-bounce" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <PartyPopper className="h-6 w-6 text-primary" />
                    {booking?.is_instant_book ? 'Booking Confirmed!' : isHold ? 'Request Submitted!' : 'Payment Successful!'}
                    <PartyPopper className="h-6 w-6 text-primary transform scale-x-[-1]" />
                  </h1>

                  {/* Status Badge */}
                  <div className="flex justify-center mb-4">
                    {booking?.is_instant_book ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmed - Instant Book
                      </span>
                    ) : isHold ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock className="h-4 w-4" />
                        Pending Host Approval
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmed
                      </span>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    {booking?.is_instant_book 
                      ? 'Your booking is confirmed! Check your email for details.'
                      : isHold 
                        ? 'Your payment has been authorized. The host will review your request.'
                        : 'Your booking has been confirmed and payment processed.'
                    }
                  </p>

                  {/* Host Review Notice for Holds (not for instant book) */}
                  {isHold && !booking?.is_instant_book && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-xl p-4 mb-6 text-left border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-sm">What happens next?</h4>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-2">
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-600">1</span>
                              <span>The host will review your booking request</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-600">2</span>
                              <span>If approved, your payment will be captured and booking confirmed</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-600">3</span>
                              <span>You'll receive pickup/location details via email and messages</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Refund Policy Notice for Holds (not for instant book) */}
                  {isHold && !booking?.is_instant_book && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl p-4 mb-6 text-left border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                            Automatic Refund Protection
                            <ShieldCheck className="h-4 w-4 text-blue-600" />
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            If the host doesn't respond within <span className="font-medium text-blue-600 dark:text-blue-400">7 days</span>, your payment authorization will be automatically released and funds returned to your account within <span className="font-medium text-blue-600 dark:text-blue-400">7-10 business days</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instant Book Confirmation Notice */}
                  {booking?.is_instant_book && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-xl p-4 mb-6 text-left border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-sm">Your booking is confirmed!</h4>
                          <ul className="text-xs text-muted-foreground mt-2 space-y-2">
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-600">✓</span>
                              <span>Payment has been processed successfully</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-600">✓</span>
                              <span>A confirmation email has been sent to you</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-600">✓</span>
                              <span>You can message the host from your dashboard</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

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
                          {/* Show hourly booking details if applicable */}
                          {booking.is_hourly_booking && booking.hourly_slots && booking.hourly_slots.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  {booking.duration_hours} hour{booking.duration_hours !== 1 ? 's' : ''} across {booking.hourly_slots.length} day{booking.hourly_slots.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="pl-5.5 space-y-1">
                                {booking.hourly_slots.slice(0, 3).map((day, idx) => (
                                  <div key={idx} className="text-xs text-muted-foreground">
                                    <span className="font-medium">
                                      {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}:
                                    </span>{' '}
                                    {day.slots.map(s => {
                                      const hour = parseInt(s.split(':')[0]);
                                      return hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`;
                                    }).join(', ')}
                                  </div>
                                ))}
                                {booking.hourly_slots.length > 3 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{booking.hourly_slots.length - 3} more days
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : booking.is_hourly_booking && booking.start_time && booking.end_time ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Clock className="h-4 w-4 text-primary" />
                              <span>
                                {new Date(booking.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {booking.start_time} – {booking.end_time}
                              </span>
                            </div>
                          ) : (
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
                          )}
                          {/* Show address for confirmed bookings (pickup/static location) */}
                          {(booking.is_instant_book || !isHold) && booking.address_snapshot && (booking.fulfillment_selected === 'pickup' || booking.fulfillment_selected === 'on_site') && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="line-clamp-1">{booking.address_snapshot}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <p className="font-bold text-lg text-primary">
                              ${booking.total_price.toFixed(2)}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              booking.is_instant_book 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : isHold 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {booking.is_instant_book ? 'Paid' : isHold ? 'Authorized' : 'Paid'}
                            </span>
                          </div>
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

                  {/* Host Payout Timeline for Confirmed Rentals (not holds) */}
                  {!isHold && (
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
                  )}

                  {/* Quick Actions for Confirmed Rentals (not holds) */}
                  {!isHold && (
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
                  )}

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

                  {/* Email Preview for Confirmed Rentals (not holds) */}
                  {!isHold && (
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
                  )}

                  <p className="text-xs text-muted-foreground mt-4">
                    {isHold 
                      ? "A confirmation email has been sent to your email address. We'll notify you when the host responds."
                      : 'A confirmation email has been sent to your email address.'
                    }
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
