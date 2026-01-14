import { ShoppingBag, Loader2, ShieldCheck, CheckCircle2, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from './StatCard';
import SaleTransactionCard from './SaleTransactionCard';
import { useBuyerSaleTransactions } from '@/hooks/useSaleTransactions';
import { useAuth } from '@/contexts/AuthContext';

const BuyerSalesSection = () => {
  const { user } = useAuth();
  const { transactions, isLoading, confirmSale, isConfirming, raiseDispute, isDisputing, stats } = useBuyerSaleTransactions(user?.id);

  const escrowTransactions = transactions.filter(t => 
    ['paid', 'seller_confirmed'].includes(t.status) && !t.buyer_confirmed_at
  );
  const confirmedTransactions = transactions.filter(t => 
    t.buyer_confirmed_at !== null || t.status === 'completed'
  );
  const otherTransactions = transactions.filter(t => 
    ['disputed', 'refunded', 'cancelled'].includes(t.status)
  );

  if (transactions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">My Purchases</h2>
        <p className="text-muted-foreground text-sm">
          Track and confirm your purchases. Funds are held in escrow until both parties confirm.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={ShoppingBag} 
          label="Total Purchases" 
          value={stats.total}
        />
        <StatCard 
          icon={ShieldCheck} 
          label="In Escrow" 
          value={stats.awaitingConfirmation}
          iconBgClass="bg-amber-100"
          iconClass="text-amber-600"
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Confirmed" 
          value={stats.confirmed}
          iconBgClass="bg-emerald-100"
          iconClass="text-emerald-600"
        />
        <StatCard 
          icon={Package} 
          label="Completed" 
          value={stats.completed}
          iconBgClass="bg-primary/10"
          iconClass="text-primary"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="escrow" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="escrow" className="relative">
            In Escrow
            {stats.awaitingConfirmation > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {stats.awaitingConfirmation}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="escrow">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : escrowTransactions.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No pending confirmations</h4>
              <p className="text-muted-foreground">
                Purchases awaiting your confirmation will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {escrowTransactions.map((transaction) => (
                <SaleTransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  role="buyer"
                  onConfirm={confirmSale}
                  isConfirming={isConfirming}
                  onDispute={raiseDispute}
                  isDisputing={isDisputing}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="confirmed">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : confirmedTransactions.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No confirmed purchases</h4>
              <p className="text-muted-foreground">
                Your confirmed and completed purchases will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {confirmedTransactions.map((transaction) => (
                <SaleTransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  role="buyer"
                  onConfirm={confirmSale}
                  isConfirming={isConfirming}
                  onDispute={raiseDispute}
                  isDisputing={isDisputing}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="other">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : otherTransactions.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No other transactions</h4>
              <p className="text-muted-foreground">
                Disputed, refunded, or cancelled transactions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {otherTransactions.map((transaction) => (
                <SaleTransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  role="buyer"
                  onConfirm={confirmSale}
                  isConfirming={isConfirming}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BuyerSalesSection;
