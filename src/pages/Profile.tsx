import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EnhancedProfileHeader from '@/components/profile/EnhancedProfileHeader';
import EnhancedProfileNextStepCard from '@/components/profile/EnhancedProfileNextStepCard';
import EnhancedProfileStatsRow from '@/components/profile/EnhancedProfileStatsRow';
import EnhancedProfileTrustSection from '@/components/profile/EnhancedProfileTrustSection';
import EnhancedProfileTabs from '@/components/profile/EnhancedProfileTabs';
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
  const { isConnected: stripeConnected, isPayoutsEnabled, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();
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
        {/* Enhanced Animated Header */}
          <EnhancedProfileHeader
            profile={profile}
            stats={stats}
            isOwnProfile={isOwnProfile}
            stripeConnected={isPayoutsEnabled}
            isFastResponder={responseTimeData?.isFastResponder}
            avgResponseTime={responseTimeData?.avgResponseTime || undefined}
            isHost={isHost}
          />

        {/* Content Section */}
        <motion.div 
          className="container py-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Next Step Card - Only show for own profile */}
          {isOwnProfile && (
            <EnhancedProfileNextStepCard
              isVerified={profile.identity_verified || false}
              stripeConnected={isPayoutsEnabled}
              isHost={isHost}
              draftCount={draftCount}
              pendingRequestCount={pendingRequestCount}
              isLoadingStripe={stripeLoading}
              onConnectStripe={connectStripe}
              isConnectingStripe={isConnecting}
            />
          )}

          {/* Stats Row */}
          <EnhancedProfileStatsRow
            stats={stats}
            isVerified={profile.identity_verified || false}
            stripeConnected={isPayoutsEnabled}
            isHost={isHost}
          />

          {/* Trust Section - Collapsible */}
          <EnhancedProfileTrustSection
            isVerified={profile.identity_verified || false}
            stripeConnected={isPayoutsEnabled}
            isHost={isHost}
            isOwnProfile={isOwnProfile}
          />

          {/* Enhanced Tabs */}
          <EnhancedProfileTabs
            listings={listings as Listing[] | undefined}
            listingsLoading={listingsLoading}
            reviewsReceived={reviewsReceived}
            reviewsGiven={reviewsGiven}
            reviewsReceivedLoading={reviewsReceivedLoading}
            reviewsGivenLoading={reviewsGivenLoading}
            isOwnProfile={isOwnProfile}
            hostVerified={profile.identity_verified || false}
            isHost={isHost}
            stats={stats}
          />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
