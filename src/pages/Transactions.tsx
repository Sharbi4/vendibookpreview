import { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Loader2, Calendar, ShoppingBag, ArrowLeft, Package, Receipt } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ShopperBookingCard from '@/components/dashboard/ShopperBookingCard';
import BookingRequestCard from '@/components/dashboard/BookingRequestCard';
import SaleTransactionCard from '@/components/dashboard/SaleTransactionCard';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useBuyerSaleTransactions, useSellerSaleTransactions } from '@/hooks/useSaleTransactions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TransactionsPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'purchases' ? 'purchases' : 'bookings';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { toast } = useToast();

  // Shopper bookings (as renter)
  const { 
    bookings: shopperBookings, 
    isLoading: shopperLoading, 
    cancelBooking: cancelShopperBooking,
    refetch: refetchShopperBookings 
  } = useShopperBookings();

  // Host bookings (as host/owner)
  const {
    bookings: hostBookings,
    isLoading: hostLoading,
    approveBooking,
    declineBooking,
    cancelBooking: cancelHostBooking,
    processDepositRefund,
  } = useHostBookings();

  // Buyer sale transactions
  const {
    transactions: buyerTransactions,
    isLoading: buyerLoading,
    confirmSale: confirmBuyerSale,
    raiseDispute: raiseBuyerDispute,
    isConfirming: isBuyerConfirming,
    isDisputing: isBuyerDisputing,
    refetch: refetchBuyerTransactions,
  } = useBuyerSaleTransactions(user?.id);

  // Seller sale transactions
  const {
    transactions: sellerTransactions,
    isLoading: sellerLoading,
    confirmSale: confirmSellerSale,
    raiseDispute: raiseSellerDispute,
    isConfirming: isSellerConfirming,
    isDisputing: isSellerDisputing,
    refetch: refetchSellerTransactions,
  } = useSellerSaleTransactions(user?.id);

  // Realtime subscriptions for sale transactions and booking updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_transactions',
          filter: `buyer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Buyer transaction update:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            toast({
              title: '🛒 New Purchase',
              description: 'Your purchase has been recorded successfully!',
            });
          }
          refetchBuyerTransactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_transactions',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Seller transaction update:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            toast({
              title: '💰 New Sale',
              description: 'You have a new sale! Check the details.',
            });
          }
          refetchSellerTransactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `shopper_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Shopper booking update:', payload.eventType);
          const newData = payload.new as any;
          if (payload.eventType === 'UPDATE' && newData?.status === 'completed') {
            toast({
              title: '✅ Booking Completed',
              description: 'Your rental has been marked as completed!',
            });
          }
          refetchShopperBookings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `host_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Host booking update:', payload.eventType);
          // Refetch handled by useHostBookings but we can add toasts for status changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchBuyerTransactions, refetchSellerTransactions, refetchShopperBookings, toast]);

  // Handle tab change and sync with URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = shopperLoading || hostLoading || buyerLoading || sellerLoading;

  // Combine counts
  const totalBookings = shopperBookings.length + hostBookings.length;
  const totalPurchases = buyerTransactions.length + sellerTransactions.length;

  return (
    <>
      <SEO 
        title="My Transactions | VendiBook"
        description="View all your bookings and purchases in one place."
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Bookings & Purchases</h1>
            <p className="text-muted-foreground mt-1">
              View all your rental bookings and sale transactions in one place.
            </p>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
              <TabsTrigger value="bookings" className="gap-2">
                <Calendar className="h-4 w-4" />
                Bookings ({totalBookings})
              </TabsTrigger>
              <TabsTrigger value="purchases" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Purchases ({totalPurchases})
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-8">
              {/* My Rentals (as shopper) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">My Rentals</h2>
                  <span className="text-sm text-muted-foreground">({shopperBookings.length})</span>
                </div>
                
                {shopperLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : shopperBookings.length === 0 ? (
                  <div className="bg-muted/30 rounded-xl p-8 text-center border border-border/50">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-semibold mb-1">No rental bookings yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your rental bookings will appear here once you book an asset.
                    </p>
                    <Button asChild>
                      <Link to="/browse">Browse Assets</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shopperBookings.map((booking, index) => (
                      <div 
                        key={booking.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ShopperBookingCard
                          booking={booking}
                          onCancel={cancelShopperBooking}
                          onPaymentInitiated={refetchShopperBookings}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Requests Received (as host) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Booking Requests Received</h2>
                  <span className="text-sm text-muted-foreground">({hostBookings.length})</span>
                </div>
                
                {hostLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : hostBookings.length === 0 ? (
                  <div className="bg-muted/30 rounded-xl p-8 text-center border border-border/50">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-semibold mb-1">No booking requests</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      When someone books your listing, it will appear here.
                    </p>
                    <Button asChild variant="outline">
                      <Link to="/list">List an Asset</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hostBookings.map((booking, index) => (
                      <div 
                        key={booking.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <BookingRequestCard
                          booking={booking}
                          onApprove={approveBooking}
                          onDecline={declineBooking}
                          onCancel={cancelHostBooking}
                          onDepositAction={processDepositRefund}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>

            {/* Purchases Tab */}
            <TabsContent value="purchases" className="space-y-8">
              {/* My Purchases (as buyer) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">My Purchases</h2>
                  <span className="text-sm text-muted-foreground">({buyerTransactions.length})</span>
                </div>
                
                {buyerLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : buyerTransactions.length === 0 ? (
                  <div className="bg-muted/30 rounded-xl p-8 text-center border border-border/50">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-semibold mb-1">No purchases yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Items you buy will appear here.
                    </p>
                    <Button asChild>
                      <Link to="/browse">Browse Assets for Sale</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {buyerTransactions.map((transaction, index) => (
                      <div 
                        key={transaction.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <SaleTransactionCard
                          transaction={transaction}
                          role="buyer"
                          onConfirm={confirmBuyerSale}
                          onDispute={raiseBuyerDispute}
                          isConfirming={isBuyerConfirming}
                          isDisputing={isBuyerDisputing}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* My Sales (as seller) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">My Sales</h2>
                  <span className="text-sm text-muted-foreground">({sellerTransactions.length})</span>
                </div>
                
                {sellerLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : sellerTransactions.length === 0 ? (
                  <div className="bg-muted/30 rounded-xl p-8 text-center border border-border/50">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h4 className="font-semibold mb-1">No sales yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Items you sell will appear here.
                    </p>
                    <Button asChild variant="outline">
                      <Link to="/list">List an Asset for Sale</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sellerTransactions.map((transaction, index) => (
                      <div 
                        key={transaction.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <SaleTransactionCard
                          transaction={transaction}
                          role="seller"
                          onConfirm={confirmSellerSale}
                          onDispute={raiseSellerDispute}
                          isConfirming={isSellerConfirming}
                          isDisputing={isSellerDisputing}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default TransactionsPage;
