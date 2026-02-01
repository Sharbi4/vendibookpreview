import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarRange, 
  Loader2, 
  Clock, 
  DollarSign, 
  Calendar,
  MapPin,
  Plus,
  Share2,
  ChevronRight,
  Sparkles,
  Eye,
  Heart
} from 'lucide-react';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import RentalCalendarView from '@/components/rentals/RentalCalendarView';
import { ShareKit, ShareKitListing } from '@/components/listing-wizard/ShareKit';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Rentals = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { listings, isLoading: listingsLoading } = useHostListings();
  const { stats: bookingStats, bookings } = useHostBookings();
  const { analytics: revenueAnalytics } = useRevenueAnalytics();
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [shareKitListing, setShareKitListing] = useState<ShareKitListing | null>(null);

  // Filter only rental listings
  const rentalListings = listings.filter(l => l.mode === 'rent');
  
  // Get pending requests count
  const pendingRequests = bookings.filter(b => b.status === 'pending').length;
  
  // Calculate next booking date
  const upcomingBookings = bookings
    .filter(b => ['approved', 'paid'].includes(b.status) && new Date(b.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const nextBookingDate = upcomingBookings[0]?.start_date;

  // Calculate bookings per listing this month
  const getListingBookingsThisMonth = (listingId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return bookings.filter(
      b => b.listing_id === listingId && 
      new Date(b.start_date) >= startOfMonth &&
      !['cancelled', 'declined'].includes(b.status)
    ).length;
  };

  // Get next booked date for a listing
  const getNextBookedDate = (listingId: string) => {
    const upcoming = bookings
      .filter(b => b.listing_id === listingId && 
        ['approved', 'paid'].includes(b.status) && 
        new Date(b.start_date) > new Date())
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    return upcoming[0]?.start_date;
  };

  // Calculate earnings this month per listing
  const getListingEarningsThisMonth = (listingId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return bookings
      .filter(b => b.listing_id === listingId && 
        new Date(b.start_date) >= startOfMonth &&
        ['paid', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
  };

  // Get pending requests count for a listing
  const getListingPendingRequests = (listingId: string) => {
    return bookings.filter(b => b.listing_id === listingId && b.status === 'pending').length;
  };

  if (authLoading || listingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your rentals...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If a listing is selected, show the calendar view
  if (selectedListingId) {
    const selectedListing = rentalListings.find(l => l.id === selectedListingId);
    if (selectedListing) {
      return (
        <RentalCalendarView 
          listing={selectedListing} 
          onBack={() => setSelectedListingId(null)} 
        />
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-5xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium mb-6">
                <CalendarRange className="h-4 w-4" />
                Rental Manager
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                Rentals
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Manage your rental listings, bookings, and payouts in one place.
              </p>
            </div>

            {/* Summary Cards - Mobile optimized */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 max-w-4xl mx-auto px-2 sm:px-0">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{pendingRequests}</p>
                      <p className="text-xs text-muted-foreground">Need your review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        ${revenueAnalytics?.revenueThisMonth?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-muted-foreground">Paid bookings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        ${revenueAnalytics?.pendingPayout?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-muted-foreground">Processing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {nextBookingDate 
                          ? new Date(nextBookingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                          : '—'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Upcoming</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Rental Listings Section */}
        <section className="py-10 md:py-14 bg-background">
          <div className="container max-w-5xl">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Your rental listings</h2>
                <p className="text-sm text-muted-foreground">Tap a listing to view the booking calendar.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/list">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Listing
                </Link>
              </Button>
            </div>

            {/* Listings Grid or Empty State */}
            {rentalListings.length === 0 ? (
              <Card className="border-0 shadow-xl">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                    <CalendarRange className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No rental listings yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Create your first rental listing to start accepting booking requests.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild variant="dark-shine">
                      <Link to="/list">
                        <Plus className="h-4 w-4 mr-2" />
                        Create a rental listing
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/help/rentals">
                        Learn how rentals work
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rentalListings.map((listing) => {
                  const nextBooked = getNextBookedDate(listing.id);
                  const bookingsThisMonth = getListingBookingsThisMonth(listing.id);
                  const earningsThisMonth = getListingEarningsThisMonth(listing.id);
                  const dailyRate = listing.price_daily || listing.price_hourly || 0;
                  const listingPendingCount = getListingPendingRequests(listing.id);
                  
                  return (
                    <Card 
                      key={listing.id} 
                      className={`border-0 shadow-xl hover:shadow-2xl transition-all group ${listingPendingCount > 0 ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <CardContent className="p-0">
                        {/* Pending Request Alert Banner */}
                        {listingPendingCount > 0 && (
                          <div 
                            className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                            onClick={() => setSelectedListingId(listing.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-amber-600" />
                              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                {listingPendingCount} request{listingPendingCount > 1 ? 's' : ''} pending review
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-900 hover:bg-amber-200 dark:text-amber-300 dark:hover:bg-amber-800">
                              Review now →
                            </Button>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row">
                          {/* Image */}
                          <div 
                            className="sm:w-48 h-40 sm:h-auto flex-shrink-0 relative cursor-pointer"
                            onClick={() => setSelectedListingId(listing.id)}
                          >
                            <img
                              src={listing.cover_image_url || '/placeholder.svg'}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                            {/* Price Badge on Image */}
                            {dailyRate > 0 && (
                              <div className="absolute bottom-2 left-2 bg-black/75 text-white px-2 py-1 rounded-lg text-sm font-semibold">
                                ${dailyRate}{listing.price_hourly ? '/hr' : '/day'}
                              </div>
                            )}
                            {/* Pending Badge on Image */}
                            {listingPendingCount > 0 && (
                              <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                                {listingPendingCount}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div>
                              <div 
                                className="flex items-start justify-between gap-2 mb-2 cursor-pointer"
                                onClick={() => setSelectedListingId(listing.id)}
                              >
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                      {listing.title}
                                    </h3>
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${
                                        listing.status === 'published' 
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                          : listing.status === 'paused'
                                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      {listing.status === 'published' ? 'Active' : listing.status === 'paused' ? 'Paused' : 'Draft'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {listing.address || listing.pickup_location_text || 'No location set'}
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                              </div>

                              {/* Analytics Row */}
                              <div className="flex items-center gap-3 text-xs sm:text-sm mt-2 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  {listing.view_count || 0} views
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  {(listing as any).favorite_count || 0} saves
                                </span>
                              </div>

                              {/* Stats Row - Mobile optimized */}
                              <div className="flex items-center gap-2 sm:gap-4 text-sm mt-3 overflow-x-auto">
                                <div className="flex-shrink-0">
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">Next</p>
                                  <p className="font-medium text-foreground text-xs sm:text-sm">
                                    {nextBooked 
                                      ? new Date(nextBooked).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                      : '—'
                                    }
                                  </p>
                                </div>
                                <div className="h-8 w-px bg-border flex-shrink-0" />
                                <div className="flex-shrink-0">
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">Bookings</p>
                                  <p className="font-medium text-foreground text-xs sm:text-sm">{bookingsThisMonth}</p>
                                </div>
                                <div className="h-8 w-px bg-border flex-shrink-0" />
                                <div className="flex-shrink-0">
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">Earnings</p>
                                  <p className="font-medium text-emerald-600 text-xs sm:text-sm">${earningsThisMonth.toLocaleString()}</p>
                                </div>
                              </div>

                              {/* Action Buttons - Mobile optimized */}
                              <div className="flex flex-wrap items-center gap-2 mt-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-9 px-3 active:scale-95 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedListingId(listing.id);
                                  }}
                                >
                                  <Calendar className="h-4 w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Calendar</span>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-9 px-3 active:scale-95 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShareKitListing({
                                      id: listing.id,
                                      title: listing.title || '',
                                      coverImageUrl: listing.cover_image_url,
                                      category: listing.category as ShareKitListing['category'],
                                      mode: 'rent',
                                      address: listing.address,
                                      priceDaily: listing.price_daily,
                                      priceWeekly: listing.price_weekly,
                                      priceSale: null,
                                      highlights: listing.highlights as string[] | undefined,
                                    });
                                  }}
                                >
                                  <Share2 className="h-4 w-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Share</span>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-9 px-3 active:scale-95 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/listing/${listing.id}`);
                                  }}
                                >
                                  <span className="hidden sm:inline">View listing</span>
                                  <span className="sm:hidden">View</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Upcoming Bookings Section (Next 7 Days) */}
            {upcomingBookings.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold text-foreground mb-4">Coming up</h2>
                <p className="text-sm text-muted-foreground mb-4">Next 7 days</p>
                <div className="grid gap-3">
                  {upcomingBookings.slice(0, 5).map((booking) => {
                    const listing = rentalListings.find(l => l.id === booking.listing_id);
                    return (
                      <Card 
                        key={booking.id} 
                        className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                        onClick={() => setSelectedListingId(booking.listing_id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{listing?.title || 'Booking'}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(booking.start_date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                                {booking.end_date && booking.end_date !== booking.start_date && (
                                  <> – {new Date(booking.end_date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}</>
                                )}
                              </p>
                            </div>
                            <Badge 
                              variant="secondary"
                              className="bg-blue-100 text-blue-700"
                            >
                              {booking.status === 'approved' ? 'Approved' : booking.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* ShareKit Modal */}
      <Dialog open={!!shareKitListing} onOpenChange={() => setShareKitListing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Listing</DialogTitle>
          </DialogHeader>
          {shareKitListing && (
            <ShareKit 
              listing={shareKitListing} 
              onClose={() => setShareKitListing(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rentals;
