import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileNextStepCard from '@/components/profile/ProfileNextStepCard';
import ProfileStatsRow from '@/components/profile/ProfileStatsRow';
import ProfileListingsTab from '@/components/profile/ProfileListingsTab';
import ProfileReviewsTab from '@/components/profile/ProfileReviewsTab';
import ProfilePhotosTab from '@/components/profile/ProfilePhotosTab';
import ProfileTrustSection from '@/components/profile/ProfileTrustSection';
import { 
  useUserProfile, 
  useUserStats, 
  useUserListings,
  useUserReviewsReceived,
  useUserReviewsGiven
} from '@/hooks/useUserProfile';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useHostResponseTime } from '@/hooks/useHostResponseTime';
import { useAuth } from '@/contexts/AuthContext';
import { Listing } from '@/types/listing';

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // If no ID provided, show current user's profile
  const profileUserId = id || user?.id;
  const isOwnProfile = user?.id === profileUserId;

  // Profile data hooks
  const { data: profile, isLoading: profileLoading } = useUserProfile(profileUserId);
  const { data: stats, isLoading: statsLoading } = useUserStats(profileUserId);
  const { data: listings, isLoading: listingsLoading } = useUserListings(profileUserId);
  const { data: reviewsReceived, isLoading: reviewsReceivedLoading } = useUserReviewsReceived(profileUserId);
  const { data: reviewsGiven, isLoading: reviewsGivenLoading } = useUserReviewsGiven(profileUserId);

  // Host-specific data (only for own profile)
  const { listings: hostListings, stats: hostStats } = useHostListings();
  const { stats: bookingStats } = useHostBookings();
  const { isConnected: stripeConnected, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();
  const { data: responseTimeData } = useHostResponseTime(profileUserId);

  const isLoading = profileLoading || statsLoading;

  // Determine if user is a host (has listings)
  const isHost = (stats?.totalListings || 0) > 0;

  // For own profile, get draft count from host listings
  const draftCount = isOwnProfile ? (hostStats?.drafts || 0) : 0;
  const pendingRequestCount = isOwnProfile ? (bookingStats?.pending || 0) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Profile not found
          </h1>
          <p className="text-muted-foreground mb-8">
            This user profile doesn't exist or is not accessible.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Compact Header */}
        <ProfileHeader
          profile={profile}
          stats={stats}
          isOwnProfile={isOwnProfile}
          stripeConnected={stripeConnected}
          isFastResponder={responseTimeData?.isFastResponder}
          avgResponseTime={responseTimeData?.avgResponseTime || undefined}
          isHost={isHost}
        />

        {/* Content Section */}
        <div className="container py-6 space-y-6">
          {/* Next Step Card - Only show for own profile */}
          {isOwnProfile && (
            <ProfileNextStepCard
              isVerified={profile.identity_verified || false}
              stripeConnected={stripeConnected}
              isHost={isHost}
              draftCount={draftCount}
              pendingRequestCount={pendingRequestCount}
              isLoadingStripe={stripeLoading}
              onConnectStripe={connectStripe}
              isConnectingStripe={isConnecting}
            />
          )}

          {/* Stats Row */}
          <ProfileStatsRow
            stats={stats}
            isVerified={profile.identity_verified || false}
            stripeConnected={stripeConnected}
            isHost={isHost}
          />

          {/* Trust Section - Collapsible */}
          <ProfileTrustSection
            isVerified={profile.identity_verified || false}
            stripeConnected={stripeConnected}
            isHost={isHost}
            isOwnProfile={isOwnProfile}
          />

          {/* Tabs */}
          <Tabs defaultValue="listings" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <TabsTrigger value="listings" className="gap-1.5 text-sm">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Listings</span>
                <span className="sm:hidden">List</span>
                {(stats?.totalListings || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({stats?.totalListings})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-sm">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Reviews</span>
                <span className="sm:hidden">Rev</span>
                {(stats?.totalReviewsReceived || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({stats?.totalReviewsReceived})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-1.5 text-sm">
                <Image className="h-4 w-4" />
                Photos
              </TabsTrigger>
            </TabsList>

            {/* Listings Tab */}
            <TabsContent value="listings" className="mt-0">
              <ProfileListingsTab
                listings={listings as Listing[] | undefined}
                isLoading={listingsLoading}
                isOwnProfile={isOwnProfile}
                hostVerified={profile.identity_verified || false}
              />
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="mt-0">
              <ProfileReviewsTab
                reviewsReceived={reviewsReceived}
                reviewsGiven={reviewsGiven}
                isLoadingReceived={reviewsReceivedLoading}
                isLoadingGiven={reviewsGivenLoading}
                isOwnProfile={isOwnProfile}
                isHost={isHost}
              />
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-0">
              <ProfilePhotosTab
                listings={listings as Listing[] | undefined}
                isLoading={listingsLoading}
                isOwnProfile={isOwnProfile}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
