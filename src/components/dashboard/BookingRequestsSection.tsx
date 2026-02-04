import { useState } from 'react';
import { Calendar, Loader2, Inbox, FileText, Filter, Zap, History, CheckCircle2, XCircle, Shield, Undo2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import BookingRequestCard from './BookingRequestCard';
import StatCard from './StatCard';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useDocumentComplianceStatus } from '@/hooks/useRequiredDocuments';

type DocFilterType = 'all' | 'instant-book' | 'pending-docs' | 'incomplete-docs' | 'complete-docs';

// Wrapper component to get compliance for filtering
const BookingWithCompliance = ({ 
  booking, 
  onApprove, 
  onDecline, 
  onCancel,
  onDepositAction,
  docFilter,
  onComplianceLoad 
}: {
  booking: any;
  onApprove: (id: string, response?: string) => void;
  onDecline: (id: string, response?: string) => void;
  onCancel?: (id: string, reason?: string, refundAmount?: number) => Promise<unknown>;
  onDepositAction?: (bookingId: string, action: 'refund' | 'partial' | 'forfeit', deductionAmount?: number, notes?: string) => Promise<unknown>;
  docFilter: DocFilterType;
  onComplianceLoad: (bookingId: string, compliance: any) => void;
}) => {
  const listingId = booking.listing_id || booking.listing?.id;
  const compliance = useDocumentComplianceStatus(listingId, booking.id);
  
  // Report compliance status back to parent for filtering
  if (!compliance.isLoading) {
    onComplianceLoad(booking.id, compliance);
  }

  // Apply filter
  if (docFilter === 'instant-book') {
    if (!booking.is_instant_book) return null;
  } else if (docFilter !== 'all' && !compliance.isLoading && compliance.hasRequirements) {
    if (docFilter === 'pending-docs' && compliance.pendingCount === 0) return null;
    if (docFilter === 'incomplete-docs' && compliance.allApproved) return null;
    if (docFilter === 'complete-docs' && !compliance.allApproved) return null;
  }

  // If filtering for docs but booking has no requirements, hide it for doc-specific filters
  if (docFilter !== 'all' && docFilter !== 'instant-book' && !compliance.hasRequirements) return null;

  return (
    <BookingRequestCard
      booking={booking}
      onApprove={onApprove}
      onDecline={onDecline}
      onCancel={onCancel}
      onDepositAction={onDepositAction}
    />
  );
};

const BookingRequestsSection = () => {
  const { bookings, isLoading, stats, approveBooking, declineBooking, cancelBooking, processDepositRefund } = useHostBookings();
  const [docFilter, setDocFilter] = useState<DocFilterType>('all');
  const [complianceCache, setComplianceCache] = useState<Record<string, any>>({});

  const handleComplianceLoad = (bookingId: string, compliance: any) => {
    setComplianceCache(prev => {
      if (JSON.stringify(prev[bookingId]) === JSON.stringify(compliance)) return prev;
      return { ...prev, [bookingId]: compliance };
    });
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const declinedBookings = bookings.filter(b => b.status === 'declined');
  const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
  const instantBookCount = bookings.filter(b => b.is_instant_book).length;

  // Calculate doc stats from cache
  const docStats = Object.values(complianceCache).reduce((acc, c) => {
    if (c.hasRequirements) {
      acc.withDocs++;
      if (c.pendingCount > 0) acc.pendingDocs++;
      if (!c.allApproved) acc.incompleteDocs++;
      if (c.allApproved) acc.completeDocs++;
    }
    return acc;
  }, { withDocs: 0, pendingDocs: 0, incompleteDocs: 0, completeDocs: 0 });

  const filterLabel = {
    'all': 'All Bookings',
    'instant-book': `Instant Book (${instantBookCount})`,
    'pending-docs': `Pending Review (${docStats.pendingDocs})`,
    'incomplete-docs': `Incomplete Docs (${docStats.incompleteDocs})`,
    'complete-docs': `Complete Docs (${docStats.completeDocs})`,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderBookings = (bookingList: typeof bookings, showCancel = false, showDepositManagement = false) => {
    const filtered = bookingList.map(booking => (
      <BookingWithCompliance
        key={booking.id}
        booking={booking}
        onApprove={approveBooking}
        onDecline={declineBooking}
        onCancel={showCancel ? cancelBooking : undefined}
        onDepositAction={showDepositManagement ? processDepositRefund : undefined}
        docFilter={docFilter}
        onComplianceLoad={handleComplianceLoad}
      />
    ));

    // Check if any items rendered when filter is active
    const isDocFilter = docFilter !== 'all';
    const hasVisibleItems = !isDocFilter || bookingList.some(b => {
      if (docFilter === 'instant-book') return b.is_instant_book;
      const c = complianceCache[b.id];
      if (!c || !c.hasRequirements) return false;
      if (docFilter === 'pending-docs') return c.pendingCount > 0;
      if (docFilter === 'incomplete-docs') return !c.allApproved;
      if (docFilter === 'complete-docs') return c.allApproved;
      return true;
    });

    if (!hasVisibleItems && isDocFilter) {
      return <EmptyState message={`No bookings match the "${filterLabel[docFilter].split(' (')[0]}" filter`} />;
    }

    return <div className="space-y-4">{filtered}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard 
          icon={Calendar} 
          label="Pending" 
          value={stats.pending}
          iconBgClass="bg-amber-100"
          iconClass="text-amber-600"
        />
        <StatCard 
          icon={Calendar} 
          label="Approved" 
          value={stats.approved}
          iconBgClass="bg-emerald-100"
          iconClass="text-emerald-600"
        />
        <StatCard 
          icon={Zap} 
          label="Instant Book" 
          value={instantBookCount}
          iconBgClass="bg-amber-100"
          iconClass="text-amber-600"
        />
        <StatCard 
          icon={FileText} 
          label="Docs Pending" 
          value={docStats.pendingDocs}
          iconBgClass="bg-blue-100"
          iconClass="text-blue-600"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Booking Requests</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-border bg-card hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200">
              <Filter className="h-4 w-4" />
              {docFilter === 'all' ? 'Filter by Docs' : filterLabel[docFilter].split(' (')[0]}
              {docFilter !== 'all' && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-foreground text-background rounded">
                  Active
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Document Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={docFilter === 'all'}
              onCheckedChange={() => setDocFilter('all')}
            >
              All Bookings
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={docFilter === 'instant-book'}
              onCheckedChange={() => setDocFilter('instant-book')}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              Instant Book
              {instantBookCount > 0 && (
                <span className="ml-auto text-xs text-amber-600">{instantBookCount}</span>
              )}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={docFilter === 'pending-docs'}
              onCheckedChange={() => setDocFilter('pending-docs')}
            >
              Pending Review
              {docStats.pendingDocs > 0 && (
                <span className="ml-auto text-xs text-amber-600">{docStats.pendingDocs}</span>
              )}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={docFilter === 'incomplete-docs'}
              onCheckedChange={() => setDocFilter('incomplete-docs')}
            >
              Incomplete Docs
              {docStats.incompleteDocs > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{docStats.incompleteDocs}</span>
              )}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={docFilter === 'complete-docs'}
              onCheckedChange={() => setDocFilter('complete-docs')}
            >
              Complete Docs
              {docStats.completeDocs > 0 && (
                <span className="ml-auto text-xs text-emerald-600">{docStats.completeDocs}</span>
              )}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 border border-border p-1 rounded-xl">
          <TabsTrigger value="pending" className="relative rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all duration-200">
            Pending
            {stats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-foreground/20 text-foreground data-[state=active]:bg-background/20 data-[state=active]:text-background rounded-full">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all duration-200">Approved</TabsTrigger>
          <TabsTrigger value="completed" className="relative rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all duration-200">
            <History className="h-3.5 w-3.5 mr-1" />
            History
            {completedBookings.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground rounded-full">
                {completedBookings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="declined" className="rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all duration-200">Declined</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingBookings.length === 0 ? (
            <EmptyState message="No pending booking requests" />
          ) : (
            renderBookings(pendingBookings)
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedBookings.length === 0 ? (
            <EmptyState message="No approved bookings yet" />
          ) : (
            renderBookings(approvedBookings, true, true)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedBookings.length === 0 ? (
            <EmptyState message="No completed rentals yet" icon={<History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />} />
          ) : (
            <div className="space-y-4">
              {completedBookings.map(booking => (
                <CompletedBookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="declined" className="mt-4">
          {declinedBookings.length === 0 ? (
            <EmptyState message="No declined requests" />
          ) : (
            renderBookings(declinedBookings)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EmptyState = ({ message, icon }: { message: string; icon?: React.ReactNode }) => (
  <div className="bg-muted/50 rounded-xl p-12 text-center">
    {icon || <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
    <p className="text-muted-foreground">{message}</p>
  </div>
);

// Completed booking card with deposit history
const CompletedBookingCard = ({ booking }: { booking: any }) => {
  const hasDeposit = (booking.deposit_amount ?? 0) > 0;
  const depositStatus = booking.deposit_status || 'pending';
  const depositAmount = booking.deposit_amount || 0;
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  const shopperInitials = booking.shopper?.full_name
    ? booking.shopper.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Listing Image */}
        <div className="sm:w-32 h-24 sm:h-auto flex-shrink-0 relative">
          <img
            src={booking.listing?.cover_image_url || '/placeholder.svg'}
            alt={booking.listing?.title || 'Listing'}
            className="w-full h-full object-cover"
          />
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium ${
            isCompleted ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
          }`}>
            {isCompleted ? 'Completed' : 'Cancelled'}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-medium text-sm text-foreground line-clamp-1">
                {booking.listing?.title || 'Listing'}
              </h4>
              <p className="text-xs text-muted-foreground">
                {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Renter Info */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center text-[10px] font-medium text-background">
              {shopperInitials}
            </div>
            <span className="text-xs text-muted-foreground">{booking.shopper?.full_name || 'Guest'}</span>
            <span className="ml-auto text-sm font-semibold">${booking.total_price}</span>
          </div>

          {/* Deposit History Section */}
          {hasDeposit && (
            <div className={`rounded-lg p-3 border ${
              depositStatus === 'refunded' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' :
              depositStatus === 'forfeited' ? 'bg-destructive/5 border-destructive/20' :
              depositStatus === 'charged' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' :
              'bg-muted/30 border-border'
            }`}>
              <div className="flex items-start gap-2">
                <Shield className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  depositStatus === 'refunded' ? 'text-emerald-600' :
                  depositStatus === 'forfeited' ? 'text-destructive' :
                  depositStatus === 'charged' ? 'text-blue-600' :
                  'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Security Deposit</span>
                    <span className="text-xs font-semibold">${depositAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {depositStatus === 'refunded' && (
                      <>
                        <Undo2 className="h-3 w-3 text-emerald-600" />
                        <span className="text-[10px] text-emerald-600 font-medium">Fully Refunded</span>
                      </>
                    )}
                    {depositStatus === 'forfeited' && (
                      <>
                        <XCircle className="h-3 w-3 text-destructive" />
                        <span className="text-[10px] text-destructive font-medium">Forfeited</span>
                      </>
                    )}
                    {depositStatus === 'charged' && (
                      <span className="text-[10px] text-blue-600 font-medium">Held • Awaiting Release</span>
                    )}
                    {depositStatus === 'pending' && (
                      <span className="text-[10px] text-muted-foreground">Never collected</span>
                    )}
                  </div>
                  {booking.deposit_refund_notes && (
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                      Note: {booking.deposit_refund_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No deposit badge */}
          {!hasDeposit && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 w-fit">
              <Shield className="h-3 w-3" />
              <span>No deposit required</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingRequestsSection;
