import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, DollarSign, CheckCircle2, Clock, XCircle, Truck, Package, FileCheck, History, Zap, Headphones, Mail, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminTransactions } from '@/hooks/useAdminTransactions';
import { useAdminPendingDocuments, useAdminDocumentStats } from '@/hooks/useAdminDocumentReview';
import { useAdminInstantBookings, useAdminInstantBookStats } from '@/hooks/useAdminInstantBookings';
import { useAdminAssetRequests } from '@/hooks/useAssetRequests';
import { useAdminUsers, useAdminUserStats } from '@/hooks/useAdminUsers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import DisputeResolutionCard from '@/components/admin/DisputeResolutionCard';
import TrackingManagementCard from '@/components/admin/TrackingManagementCard';
import AdminDocumentReviewCard from '@/components/admin/AdminDocumentReviewCard';
import AdminDocumentHistorySection from '@/components/admin/AdminDocumentHistorySection';
import AdminBulkDocumentActions from '@/components/admin/AdminBulkDocumentActions';
import AdminBookingDocumentGroup from '@/components/admin/AdminBookingDocumentGroup';
import InstantBookMonitorCard from '@/components/admin/InstantBookMonitorCard';
import ConciergeQueueCard from '@/components/admin/ConciergeQueueCard';
import EmailPreviewCard from '@/components/admin/EmailPreviewCard';
import AdminUsersListCard from '@/components/admin/AdminUsersListCard';

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
  const { data: instantBookings, isLoading: instantBookLoading } = useAdminInstantBookings();
  const instantBookStats = useAdminInstantBookStats();
  const { allRequests, isLoading: conciergeLoading, updateStatus, isUpdating: conciergeUpdating, stats: conciergeStats } = useAdminAssetRequests();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const userStats = useAdminUserStats(users);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');

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
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Concierge</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{conciergeStats.new}</p>
              <p className="text-xs text-muted-foreground">new requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Instant Books</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{instantBookStats.pendingDocs}</p>
              <p className="text-xs text-muted-foreground">docs pending</p>
            </CardContent>
          </Card>
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
        <Tabs defaultValue="concierge" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="concierge" className="relative">
              <Headphones className="h-4 w-4 mr-1" />
              Concierge
              {conciergeStats.new > 0 && (
                <Badge className="ml-2 h-5 px-1.5 bg-purple-500">
                  {conciergeStats.new}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="instant-book" className="relative">
              <Zap className="h-4 w-4 mr-1" />
              Instant Book
              {instantBookStats.pendingDocs > 0 && (
                <Badge className="ml-2 h-5 px-1.5 bg-amber-500">
                  {instantBookStats.pendingDocs}
                </Badge>
              )}
            </TabsTrigger>
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
            <TabsTrigger value="emails" className="relative">
              <Mail className="h-4 w-4 mr-1" />
              Email Previews
            </TabsTrigger>
            <TabsTrigger value="users" className="relative">
              <Users className="h-4 w-4 mr-1" />
              Users
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {userStats.total}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Concierge Tab */}
          <TabsContent value="concierge" className="space-y-4">
            {conciergeLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : !allRequests || allRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Headphones className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Asset Requests</h3>
                  <p className="text-muted-foreground">No concierge requests have been submitted yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{conciergeStats.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">New</p>
                      <p className="text-2xl font-bold text-blue-600">{conciergeStats.new}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Contacted</p>
                      <p className="text-2xl font-bold text-amber-600">{conciergeStats.contacted}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Matched</p>
                      <p className="text-2xl font-bold text-emerald-600">{conciergeStats.matched}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Request Cards */}
                {allRequests.map((request) => (
                  <ConciergeQueueCard
                    key={request.id}
                    request={request}
                    onUpdate={updateStatus}
                    isUpdating={conciergeUpdating}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Instant Book Tab */}
          <TabsContent value="instant-book" className="space-y-4">
            {instantBookLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : !instantBookings || instantBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Instant Bookings</h3>
                  <p className="text-muted-foreground">No instant book bookings have been made yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Total Instant Books</p>
                      <p className="text-2xl font-bold">{instantBookStats.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Docs Pending Review</p>
                      <p className="text-2xl font-bold text-amber-600">{instantBookStats.pendingDocs}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Fully Approved</p>
                      <p className="text-2xl font-bold text-emerald-600">{instantBookStats.approved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Docs Rejected</p>
                      <p className="text-2xl font-bold text-red-600">{instantBookStats.rejected}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Booking Cards */}
                {instantBookings.map((booking) => (
                  <InstantBookMonitorCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab - Grouped by Booking */}
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
                {/* Global Bulk Actions */}
                <AdminBulkDocumentActions
                  documents={pendingDocuments}
                  selectedIds={selectedDocIds}
                  onSelectionChange={setSelectedDocIds}
                />
                
                {/* Group documents by booking */}
                {(() => {
                  // Group documents by booking_id
                  const groupedByBooking = pendingDocuments.reduce((acc, doc) => {
                    const bookingId = doc.booking_id;
                    if (!acc[bookingId]) {
                      acc[bookingId] = [];
                    }
                    acc[bookingId].push(doc);
                    return acc;
                  }, {} as Record<string, typeof pendingDocuments>);

                  return Object.entries(groupedByBooking).map(([bookingId, docs]) => (
                    <AdminBookingDocumentGroup
                      key={bookingId}
                      bookingId={bookingId}
                      documents={docs}
                      selectedIds={selectedDocIds}
                      onSelectionChange={(docId, selected) => {
                        setSelectedDocIds(prev => {
                          const newSet = new Set(prev);
                          if (selected) {
                            newSet.add(docId);
                          } else {
                            newSet.delete(docId);
                          }
                          return newSet;
                        });
                      }}
                    />
                  ));
                })()}
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

          {/* Email Previews Tab */}
          <TabsContent value="emails" className="space-y-4">
            <EmailPreviewCard />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {usersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : !users || users.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Users</h3>
                  <p className="text-muted-foreground">No users have registered yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{userStats.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Hosts</p>
                      <p className="text-2xl font-bold text-primary">{userStats.hosts}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Verified</p>
                      <p className="text-2xl font-bold text-emerald-600">{userStats.verified}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Stripe Connected</p>
                      <p className="text-2xl font-bold text-blue-600">{userStats.stripeConnected}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm text-muted-foreground">Admins</p>
                      <p className="text-2xl font-bold text-primary">{userStats.admins}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Search */}
                <Input
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="max-w-md"
                />

                {/* User Cards */}
                {users
                  .filter((u) => {
                    if (!userSearch) return true;
                    const search = userSearch.toLowerCase();
                    return (
                      u.full_name?.toLowerCase().includes(search) ||
                      u.display_name?.toLowerCase().includes(search) ||
                      u.email?.toLowerCase().includes(search)
                    );
                  })
                  .map((user) => (
                    <AdminUsersListCard key={user.id} user={user} />
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;