import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Truck, Eye, Loader2, Calendar, BarChart3, DollarSign, HandCoins, ExternalLink, Grid3X3, List, LayoutGrid, HelpCircle, Settings, Shield, MessageSquare, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompactStatCard } from './CompactStatCard';
import { CompactInsights } from './CompactInsights';
import { NextBestAction } from './NextBestAction';
import { OnboardingChecklist } from './OnboardingChecklist';
import StripeNotificationBubble from './StripeNotificationBubble';
import HostListingCard from './HostListingCard';
import BookingRequestsSection from './BookingRequestsSection';
import SellerSalesSection from './SellerSalesSection';
import DraftsSection from './DraftsSection';
import { EnhancedAnalytics } from './EnhancedAnalytics';
import { RevenueAnalyticsCard } from './RevenueAnalyticsCard';
import { HostOffersSection } from './HostOffersSection';
import HostOnboardingWizard from './HostOnboardingWizard';

import ActionRequiredBanner from './ActionRequiredBanner';
import { OperationsTable } from './OperationsTable';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useListingAnalytics } from '@/hooks/useListingAnalytics';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useHostOffers } from '@/hooks/useHostOffers';
import { useAuth } from '@/contexts/AuthContext';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useMemo, useState } from 'react';

const HostDashboard = () => {
  const { user, profile, isVerified } = useAuth();
  const [searchParams] = useSearchParams();
  const { listings, isLoading, stats, pauseListing, publishListing, deleteListing, updateListingPrice } = useHostListings();
  const { stats: bookingStats } = useHostBookings();
  const { isConnected, hasAccountStarted, isLoading: stripeLoading, connectStripe, isConnecting, openStripeDashboard, isOpeningDashboard } = useStripeConnect();
  const { analytics, isLoading: analyticsLoading } = useListingAnalytics();
  const { analytics: revenueAnalytics, isLoading: revenueLoading } = useRevenueAnalytics();
  const { pendingOffers } = useHostOffers();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // URL-controlled tab
  const activeTab = searchParams.get('tab') || 'overview';

  // Determine user type based on listing modes
  const userType = useMemo(() => {
    const hasRentals = listings.some(l => l.mode === 'rent');
    const hasSales = listings.some(l => l.mode === 'sale');
    if (hasRentals && hasSales) return 'hybrid';
    if (hasSales) return 'seller';
    return 'host';
  }, [listings]);

  // Corporate/Power User detection
  const isPowerUser = listings.length > 2;

  // Filter drafts for the DraftsSection
  const draftListings = useMemo(() => 
    listings.filter(l => l.status === 'draft'),
    [listings]
  );

  const handleConnectStripe = async () => {
    await connectStripe();
  };

  const handlePublish = async (id: string) => {
    if (!isConnected) {
      setShowStripeModal(true);
      return;
    }
    publishListing(id);
  };

  // Zero State: no special onboarding, show normal dashboard

  // Check if there are actions requiring attention
  const hasActionRequired = bookingStats.pending > 0 || pendingOffers.length > 0 || draftListings.length > 0;

  return (
    <div className="space-y-6">
      {/* Action Required Banner - Above everything */}
      {hasActionRequired && (
        <ActionRequiredBanner 
          pendingRequests={bookingStats.pending}
          pendingOffers={pendingOffers.length}
          draftListings={draftListings.length}
        />
      )}

      {/* Stripe Status - Top priority (blocks payouts) */}
      {!isConnected && !stripeLoading && (
        <StripeNotificationBubble
          isConnected={isConnected}
          isLoading={stripeLoading}
          onConnect={handleConnectStripe}
          isConnecting={isConnecting}
        />
      )}

      {/* Dashboard Header - Slim, 3 primary actions + overflow */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <LayoutGrid className="h-5 w-5 text-background" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {bookingStats.pending > 0
                  ? `You have ${bookingStats.pending} pending request${bookingStats.pending > 1 ? 's' : ''} — quick replies boost bookings 40%.`
                  : pendingOffers.length > 0
                  ? `${pendingOffers.length} offer${pendingOffers.length > 1 ? 's' : ''} waiting on your reply.`
                  : draftListings.length > 0
                  ? `${draftListings.length} draft${draftListings.length > 1 ? 's' : ''} ready to publish.`
                  : userType === 'seller'
                  ? 'Manage your sales pipeline.'
                  : 'Manage availability and revenue.'}
              </p>
            </div>
          </div>

          {/* 3 primary actions + overflow */}
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="dark-shine" size="sm" className="h-10 rounded-xl px-3 sm:px-4">
              <Link to="/list?start=true">
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Add Listing</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-10 rounded-xl px-3 sm:px-4">
              <Link to="/host/bookings">
                <Calendar className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Bookings</span>
                {bookingStats.pending > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                    {bookingStats.pending}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-10 rounded-xl px-3 sm:px-4">
              <Link to="/messages">
                <MessageSquare className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Inbox</span>
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/host/listings"><Grid3X3 className="h-4 w-4 mr-2" />My Listings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/host/reporting"><BarChart3 className="h-4 w-4 mr-2" />Reporting</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/profile/${user?.id}`}><ExternalLink className="h-4 w-4 mr-2" />My Storefront</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/verify-identity"><Shield className="h-4 w-4 mr-2" />Verify ID</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account"><Settings className="h-4 w-4 mr-2" />Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/help"><HelpCircle className="h-4 w-4 mr-2" />Support</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Next Best Action - Contextual guidance */}
      {activeTab === 'overview' && (
        <NextBestAction
          publishedListings={stats.published}
          draftListings={draftListings.length}
          isStripeConnected={isConnected}
          isIdentityVerified={isVerified}
          pendingRequests={bookingStats.pending}
          pendingOffers={pendingOffers.length}
          firstName={profile?.full_name?.split(' ')[0]}
        />
      )}

      {/* Onboarding Checklist - Activation progress */}
      {activeTab === 'overview' && !stripeLoading && (
        <OnboardingChecklist
          isStripeConnected={isConnected}
          isIdentityVerified={isVerified}
          hasPublishedListing={stats.published > 0}
          hasFirstBooking={(bookingStats.total ?? 0) > 0 || (revenueAnalytics?.totalRevenue ?? 0) > 0}
          onConnectStripe={handleConnectStripe}
        />
      )}
      {/* Key Metrics Row - Airbnb Minimal Style */}
      <div className={`grid grid-cols-2 gap-4 ${userType === 'hybrid' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <CompactStatCard 
          icon={Truck} 
          label="Listings" 
          value={stats.published}
          subtext={stats.drafts > 0 ? `${stats.drafts} drafts` : "Active"}
          href="/host/listings"
        />
        <CompactStatCard 
          icon={Eye} 
          label="Views" 
          value={analytics?.totalViews || 0}
          subtext="Last 30 days"
        />
        {userType !== 'seller' && (
          <CompactStatCard 
            icon={Calendar} 
            label="Requests" 
            value={bookingStats.pending}
            subtext="Awaiting response"
            highlight={bookingStats.pending > 0}
          />
        )}
        {(userType !== 'host' || pendingOffers.length > 0) && (
          <CompactStatCard 
            icon={HandCoins} 
            label="Offers" 
            value={pendingOffers.length}
            subtext="Pending review"
            highlight={pendingOffers.length > 0}
          />
        )}
        <CompactStatCard 
          icon={DollarSign} 
          label="Revenue" 
          value={revenueAnalytics?.revenueThisMonth ? `$${revenueAnalytics.revenueThisMonth.toLocaleString()}` : '$0'}
          subtext="This month"
        />
      </div>

      {/* Resume Drafts Section - Only show on Overview */}
      {!isLoading && draftListings.length > 0 && activeTab === 'overview' && (
        <DraftsSection drafts={draftListings} onDelete={deleteListing} />
      )}

      {/* View Toggle for Power Users - Only on Inventory */}
      {isPowerUser && activeTab === 'inventory' && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Priority: Bookings & Offers - Only show if there are pending requests */}
              {userType !== 'seller' && bookingStats.pending > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <BookingRequestsSection />
                </div>
              )}
              <HostOffersSection />
            </div>
            <div className="space-y-6">
              {/* Quick Analytics */}
              <CompactInsights />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Inventory (Listings & Drafts) */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Drafts Section - Show in Inventory */}
          {!isLoading && draftListings.length > 0 && (
            <DraftsSection drafts={draftListings} onDelete={deleteListing} />
          )}
          
          {viewMode === 'table' && isPowerUser ? (
            <OperationsTable 
              listings={listings}
              onPublish={handlePublish}
              onPause={pauseListing}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">My Listings</h3>
                <Button variant="dark-shine" size="sm" asChild className="h-8 text-xs rounded-xl">
                  <Link to="/list">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    New Listing
                  </Link>
                </Button>
              </div>
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : listings.filter(l => l.status !== 'draft').length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No published listings yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create a listing to start earning.
                    </p>
                    <Button asChild size="sm" variant="dark-shine" className="rounded-xl">
                      <Link to="/list">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        New Listing
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.filter(l => l.status !== 'draft').map((listing) => (
                      <HostListingCard
                        key={listing.id}
                        listing={listing}
                        onPause={pauseListing}
                        onPublish={handlePublish}
                        onDelete={deleteListing}
                        onPriceUpdate={updateListingPrice}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Reservations (Bookings & Transactions) */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {userType !== 'seller' && bookingStats.pending > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border">
              <BookingRequestsSection />
            </div>
          )}
          {/* Include transactions here */}
          {userType !== 'host' && <SellerSalesSection />}
        </div>
      )}

      {/* Tab Content: Financials */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Revenue Analytics */}
          <div className="p-4 rounded-xl bg-card border border-border">
            {revenueLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : revenueAnalytics ? (
              <RevenueAnalyticsCard 
                analytics={revenueAnalytics} 
                onOpenStripeDashboard={openStripeDashboard}
                isOpeningDashboard={isOpeningDashboard}
              />
            ) : (
              <div className="py-8 text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No revenue yet</p>
                <p className="text-xs text-muted-foreground">
                  Revenue analytics appear once you make sales.
                </p>
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="p-4 rounded-xl bg-card border border-border">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : analytics ? (
              <EnhancedAnalytics 
                analytics={analytics} 
                stats={stats}
                bookingStats={bookingStats}
              />
            ) : (
              <div className="py-8 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No views yet</p>
                <p className="text-xs text-muted-foreground">
                  Publish a listing to start getting discovered.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Stripe Connect Modal */}
      <StripeConnectModal
        open={showStripeModal}
        onOpenChange={setShowStripeModal}
        onConnect={handleConnectStripe}
        isConnecting={isConnecting}
      />
    </div>
  );
};

export default HostDashboard;
