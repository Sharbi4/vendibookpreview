import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, DollarSign, TrendingUp, Clock, CheckCircle2, 
  ArrowRight, Wallet, PiggyBank, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminFinance } from '@/hooks/useAdminFinance';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/commissions';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminFinance = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isAdmin, 
    isCheckingAdmin, 
    stats, 
    recentTransactions,
    pendingPayouts,
    isLoading,
    refetch
  } = useAdminFinance(user?.id);
  
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPayouts = async () => {
    setIsRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('retry-pending-payouts');
      
      if (error) throw error;
      
      if (data.processed > 0) {
        toast.success(`Processed ${data.processed} payouts successfully`);
        refetch();
      } else if (data.failed > 0) {
        toast.warning(`${data.failed} payouts failed. Check individual statuses.`);
      } else if (data.skipped > 0) {
        toast.info(`${data.skipped} payouts skipped due to insufficient balance`);
      } else {
        toast.info(data.message || 'No pending payouts to process');
      }
      
      console.log('Retry payouts result:', data);
    } catch (error) {
      console.error('Failed to retry payouts:', error);
      toast.error('Failed to retry payouts');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin && user) {
      navigate('/');
    }
  }, [isAdmin, isCheckingAdmin, user, navigate]);

  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Wallet className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Platform Finance</h1>
              <p className="text-muted-foreground">Commission earnings and pending payouts</p>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <Shield className="h-4 w-4 mr-2" />
            Admin Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Earnings</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                From {stats.completedTransactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending Payouts</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(stats.totalPending)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingPayoutTransactions} awaiting transfer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Last 30 Days</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold">{formatCurrency(stats.last30DaysEarnings)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Commission earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Last 7 Days</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold">{formatCurrency(stats.last7DaysEarnings)}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Commission earned</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Payouts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Pending Payouts
                  </CardTitle>
                  <CardDescription>
                    Transactions awaiting seller payout transfer
                  </CardDescription>
                </div>
                {pendingPayouts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryPayouts}
                    disabled={isRetrying}
                    className="shrink-0"
                  >
                    {isRetrying ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Retry Payouts
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : pendingPayouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                  <p>No pending payouts</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingPayouts.map((payout) => (
                    <div 
                      key={payout.id} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{payout.listing_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Seller: {payout.seller_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payout.created_at), 'MMM d, yyyy')}
                        </p>
                        {payout.message && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {payout.message}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-amber-600">
                          {formatCurrency(payout.seller_payout)}
                        </p>
                        <p className="text-xs text-muted-foreground">owed</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Commission Earnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Recent Commission Earnings
              </CardTitle>
              <CardDescription>
                Completed transactions with payouts processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No completed transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{tx.listing_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Sale: {formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.payout_completed_at && format(new Date(tx.payout_completed_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-emerald-600">
                          +{formatCurrency(tx.platform_fee)}
                        </p>
                        <p className="text-xs text-muted-foreground">12.9% fee</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Commission Rate Info */}
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline" className="text-sm">
                Sale Commission: 12.9% seller fee
              </Badge>
              <Badge variant="outline" className="text-sm">
                Rental Commission: 12.9% host + 12.9% renter
              </Badge>
              <span className="text-sm text-muted-foreground ml-auto">
                Commission retained in platform Stripe account upon checkout
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/admin')}
          >
            <Shield className="h-5 w-5 mr-3 text-primary" />
            <div className="text-left">
              <div className="font-medium">Admin Dashboard</div>
              <div className="text-xs text-muted-foreground">Disputes & transactions</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/admin/metrics')}
          >
            <TrendingUp className="h-5 w-5 mr-3 text-blue-500" />
            <div className="text-left">
              <div className="font-medium">Operator Metrics</div>
              <div className="text-xs text-muted-foreground">Funnels & liquidity</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/admin?tab=transactions')}
          >
            <DollarSign className="h-5 w-5 mr-3 text-emerald-500" />
            <div className="text-left">
              <div className="font-medium">All Transactions</div>
              <div className="text-xs text-muted-foreground">View transaction details</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminFinance;
