import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Truck, Loader2, Grid3X3, List, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import HostListingCard from '@/components/dashboard/HostListingCard';
import DraftsSection from '@/components/dashboard/DraftsSection';
import { OperationsTable } from '@/components/dashboard/OperationsTable';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';
import { useHostListings } from '@/hooks/useHostListings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';

const HostListings = () => {
  const { hasRole } = useAuth();
  const { listings, isLoading, stats, pauseListing, publishListing, deleteListing, updateListingPrice } = useHostListings();
  const { isConnected, connectStripe, isConnecting } = useStripeConnect();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  usePageTracking();

  const isHost = hasRole('host');
  const isPowerUser = listings.length > 2;

  const draftListings = listings.filter(l => l.status === 'draft');
  const publishedListings = listings.filter(l => l.status !== 'draft');

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

  return (
    <DashboardLayout 
      mode="host" 
      onModeChange={() => {}}
      isHost={isHost}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard?view=host" 
                className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </Link>
              <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
                <Truck className="h-6 w-6 text-background" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">My Listings</h1>
                <p className="text-sm text-muted-foreground">
                  {stats.published} published · {stats.drafts} drafts · {stats.paused} paused
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle for Power Users */}
              {isPowerUser && (
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
              )}
              
              <Button asChild variant="dark-shine" className="rounded-xl">
                <Link to="/list">
                  <Plus className="h-4 w-4 mr-2" />
                  New Listing
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Drafts Section */}
        {!isLoading && draftListings.length > 0 && (
          <DraftsSection drafts={draftListings} onDelete={deleteListing} />
        )}

        {/* Listings Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'table' && isPowerUser ? (
          <OperationsTable 
            listings={listings}
            onPublish={handlePublish}
            onPause={pauseListing}
          />
        ) : publishedListings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No published listings yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first listing to start earning. You can rent out food trucks, trailers, or sell equipment.
            </p>
            <Button asChild variant="dark-shine" className="rounded-xl">
              <Link to="/list">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Listing
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Published Listings ({publishedListings.length})</h3>
            </div>
            <div className="p-4 space-y-3">
              {publishedListings.map((listing) => (
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
          </div>
        )}
      </div>

      {/* Stripe Connect Modal */}
      <StripeConnectModal
        open={showStripeModal}
        onOpenChange={setShowStripeModal}
        onConnect={handleConnectStripe}
        isConnecting={isConnecting}
      />
    </DashboardLayout>
  );
};

export default HostListings;
