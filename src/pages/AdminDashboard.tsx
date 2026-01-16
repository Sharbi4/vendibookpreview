import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, DollarSign, CheckCircle2, Clock, XCircle, Truck, Package, FileCheck, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminTransactions } from '@/hooks/useAdminTransactions';
import { useAdminPendingDocuments, useAdminDocumentStats } from '@/hooks/useAdminDocumentReview';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DisputeResolutionCard from '@/components/admin/DisputeResolutionCard';
import TrackingManagementCard from '@/components/admin/TrackingManagementCard';
import AdminDocumentReviewCard from '@/components/admin/AdminDocumentReviewCard';
import AdminDocumentHistorySection from '@/components/admin/AdminDocumentHistorySection';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isAdmin, 
    isCheckingAdmin, 
    disputedTransactions, 
    allTransactions,
    shippingTransactions,
    isLoading,
    resolveDispute,
    isResolving,
    updateTracking,
    isUpdatingTracking,
    stats,
    shippingStats,
  } = useAdminTransactions(user?.id);

  const { data: pendingDocuments, isLoading: docsLoading } = useAdminPendingDocuments();
  const documentStats = useAdminDocumentStats();

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
                <Skeleton key={i} className="h-24" />
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
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage disputes, documents, shipping, and transactions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Docs Pending</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{documentStats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Disputed</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{stats.disputed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">In Escrow</span>
              </div>
              <p className="text-2xl font-bold">{stats.inEscrow}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">In Transit</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{shippingStats.inTransit}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="disputes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="disputes" className="relative">
              Disputes
              {stats.disputed > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {stats.disputed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shipping" className="relative">
              Shipping
              {shippingStats.pending > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {shippingStats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="relative">
              Documents
              {documentStats.pending > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-amber-100 text-amber-700">
                  {documentStats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="doc-history" className="relative">
              <History className="h-4 w-4 mr-1" />
              Doc History
            </TabsTrigger>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {docsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : !pendingDocuments || pendingDocuments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Pending Documents</h3>
                  <p className="text-muted-foreground">All document submissions have been reviewed.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingDocuments.map((doc) => (
                  <AdminDocumentReviewCard key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Document History Tab */}
          <TabsContent value="doc-history" className="space-y-4">
            <AdminDocumentHistorySection />
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : disputedTransactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Active Disputes</h3>
                  <p className="text-muted-foreground">All disputes have been resolved.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {disputedTransactions.map((transaction) => (
                  <DisputeResolutionCard
                    key={transaction.id}
                    transaction={transaction}
                    onResolve={resolveDispute}
                    isResolving={isResolving}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : shippingTransactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Shipping Orders</h3>
                  <p className="text-muted-foreground">No orders requiring shipping management.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {shippingTransactions.map((transaction) => (
                  <TrackingManagementCard
                    key={transaction.id}
                    transaction={transaction}
                    onUpdateTracking={updateTracking}
                    isUpdating={isUpdatingTracking}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : allTransactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Transactions</h3>
                  <p className="text-muted-foreground">No sale transactions found.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">ID</th>
                          <th className="text-left py-3 px-2 font-medium">Listing</th>
                          <th className="text-left py-3 px-2 font-medium">Buyer</th>
                          <th className="text-left py-3 px-2 font-medium">Seller</th>
                          <th className="text-left py-3 px-2 font-medium">Amount</th>
                          <th className="text-left py-3 px-2 font-medium">Status</th>
                          <th className="text-left py-3 px-2 font-medium">Shipping</th>
                          <th className="text-left py-3 px-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 font-mono text-xs">
                              {tx.id.slice(0, 8)}...
                            </td>
                            <td className="py-3 px-2">
                              {tx.listing?.title?.slice(0, 25) || 'Unknown'}
                              {(tx.listing?.title?.length || 0) > 25 && '...'}
                            </td>
                            <td className="py-3 px-2">{tx.buyer?.full_name || 'Unknown'}</td>
                            <td className="py-3 px-2">{tx.seller?.full_name || 'Unknown'}</td>
                            <td className="py-3 px-2 font-medium">${tx.amount.toLocaleString()}</td>
                            <td className="py-3 px-2">
                              <Badge 
                                variant={
                                  tx.status === 'disputed' ? 'destructive' :
                                  tx.status === 'completed' ? 'default' :
                                  tx.status === 'refunded' ? 'secondary' :
                                  'outline'
                                }
                              >
                                {tx.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              {tx.fulfillment_type === 'delivery' || tx.fulfillment_type === 'vendibook_freight' ? (
                                <Badge 
                                  variant="outline"
                                  className={
                                    tx.shipping_status === 'delivered' ? 'border-emerald-500 text-emerald-600' :
                                    tx.shipping_status === 'shipped' || tx.shipping_status === 'in_transit' ? 'border-blue-500 text-blue-600' :
                                    'border-amber-500 text-amber-600'
                                  }
                                >
                                  {tx.shipping_status || 'pending'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;