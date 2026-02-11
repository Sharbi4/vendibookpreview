import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Loader2, ShieldCheck, MessageCircle, Flag, ShieldAlert, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EnhancedPublicProfileHeader from '@/components/profile/EnhancedPublicProfileHeader';

import EnhancedPublicProfileTabs from '@/components/profile/EnhancedPublicProfileTabs';
import ShopPoliciesCard, { ShopPolicies } from '@/components/profile/ShopPoliciesCard';
import StorefrontEventsSection from '@/components/profile/StorefrontEventsSection';
import StorefrontGallerySection from '@/components/profile/StorefrontGallerySection';
import StorefrontFeaturedListing from '@/components/profile/StorefrontFeaturedListing';
import StorefrontTrustStrip from '@/components/profile/StorefrontTrustStrip';
import StorefrontCategoryShowcase from '@/components/profile/StorefrontCategoryShowcase';
import StorefrontStickyContact from '@/components/profile/StorefrontStickyContact';
import SEO from '@/components/SEO';
import { 
  useUserStats, 
  useUserListings,
  useUserReviewsReceived,
  useUserReviewsGiven
} from '@/hooks/useUserProfile';
import { useHostResponseTime } from '@/hooks/useHostResponseTime';
import { useHostBadges } from '@/hooks/useHostBadges';
import { useSoldListings } from '@/hooks/useSoldListings';
import { useHostEvents } from '@/hooks/useHostEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Listing } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';
import { useConversations } from '@/hooks/useConversations';
import { useState, useRef, useEffect } from 'react';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { getPublicDisplayName } from '@/lib/displayName';
// Type for public profile data
interface PublicProfileData {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  username: string | null;
  business_name: string | null;
  public_city: string | null;
  public_state: string | null;
  avatar_url: string | null;
  header_image_url: string | null;
  identity_verified: boolean;
  created_at: string;
  bio?: string | null;
  shop_policies?: ShopPolicies | null;
  pinned_listing_id?: string | null;
}

// Hook to fetch public profile - supports both userId and username
const usePublicProfile = (identifier: string | undefined, isUsername: boolean = false) => {
  return useQuery<PublicProfileData | null>({
    queryKey: ['public-profile', identifier, isUsername],
    queryFn: async (): Promise<PublicProfileData | null> => {
      if (!identifier) return null;

      // If using username, fetch by username first
      if (isUsername) {
        const { data: profileByUsername, error } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, display_name, username, business_name, public_city, public_state, avatar_url, header_image_url, identity_verified, created_at, bio, shop_policies, pinned_listing_id')
          .eq('username', identifier)
          .single();
        
        if (error || !profileByUsername) return null;
        return profileByUsername as unknown as PublicProfileData;
      }

      // Use secure RPC for userId
      const { data, error } = await supabase.rpc('get_safe_host_profile', {
        host_user_id: identifier
      });

      if (error) throw error;
      
      const profile = data?.[0];
      if (!profile) {
        const { data: directData, error: directError } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, display_name, username, business_name, public_city, public_state, avatar_url, header_image_url, identity_verified, created_at, bio, shop_policies, pinned_listing_id')
          .eq('id', identifier)
          .single();
        
        if (directError) throw directError;
        return directData as unknown as PublicProfileData;
      }

      return profile as unknown as PublicProfileData;
    },
    enabled: !!identifier,
  });
};

// Hook to get completed bookings count (safe public metric)
const useCompletedBookingsCount = (hostId: string | undefined) => {
  return useQuery({
    queryKey: ['completed-bookings-count', hostId],
    queryFn: async () => {
      if (!hostId) return 0;
      const { count } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', hostId)
        .eq('status', 'completed');
      return count || 0;
    },
    enabled: !!hostId,
  });
};

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const listingContext = searchParams.get('from_listing');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreateConversation } = useConversations();
  const [isMessaging, setIsMessaging] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const listingsRef = useRef<HTMLDivElement>(null);
  
  // Determine if userId is a username (no dashes = username, with dashes = UUID)
  const isUsername = userId ? !userId.includes('-') : false;
  
  // Fetch profile
  const { data: profileData, isLoading: profileLoading } = usePublicProfile(userId, isUsername);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any;
  
  // Get actual userId for other queries
  const actualUserId = profile?.id;
  const isOwnProfile = user?.id === actualUserId;
  
  // Other data hooks
  const { data: stats, isLoading: statsLoading } = useUserStats(actualUserId);
  const { data: listings, isLoading: listingsLoading } = useUserListings(actualUserId);
  const { data: reviewsReceived, isLoading: reviewsReceivedLoading } = useUserReviewsReceived(actualUserId);
  const { data: reviewsGiven, isLoading: reviewsGivenLoading } = useUserReviewsGiven(actualUserId);
  const { data: responseTimeData } = useHostResponseTime(actualUserId);
  const { data: completedBookings } = useCompletedBookingsCount(actualUserId);
  const { data: soldListings, isLoading: soldListingsLoading } = useSoldListings(actualUserId);
  const { data: hostEvents, isLoading: eventsLoading } = useHostEvents(actualUserId);
  
  // Calculate host badges
  const hostBadges = useHostBadges(
    actualUserId,
    stats?.averageRating,
    stats?.totalReviewsReceived,
    responseTimeData?.isFastResponder
  );

  const isLoading = profileLoading || statsLoading;
  const isHost = (stats?.totalListings || 0) > 0;

  // Display name logic - use public display name utility
  const displayName = profile ? getPublicDisplayName(profile) : 'User';

  // Derive service area from listings if not set in profile
  const serviceArea = (() => {
    const profileLocation = [profile?.public_city, profile?.public_state].filter(Boolean).join(', ');
    if (profileLocation) return profileLocation;
    
    // Fallback: derive from listings
    if (listings && listings.length > 0) {
      const cities = new Set<string>();
      listings.forEach((l: Listing) => {
        if (l.address) {
          const parts = l.address.split(',');
          if (parts.length >= 2) {
            cities.add(parts[parts.length - 2].trim());
          }
        }
      });
      if (cities.size > 0) {
        const cityArray = Array.from(cities);
        if (cityArray.length === 1) return cityArray[0];
        return `${cityArray.slice(0, 2).join(', ')}${cityArray.length > 2 ? ` +${cityArray.length - 2}` : ''}`;
      }
    }
    return null;
  })();

  // Track profile view
  useEffect(() => {
    if (actualUserId && !isOwnProfile) {
      trackEventToDb('profile_view', 'engagement', { 
        host_id: actualUserId,
        from_listing: listingContext 
      });
    }
  }, [actualUserId, isOwnProfile, listingContext]);

  // Handle message host
  const handleMessageHost = async () => {
    trackEventToDb('message_host_click', 'conversion', { 
      host_id: actualUserId,
      from_listing: listingContext,
      source: 'profile' 
    });

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to message this host.',
      });
      navigate('/auth', { state: { from: `/u/${userId}` } });
      return;
    }

    if (user.id === actualUserId) {
      toast({
        title: 'Cannot message yourself',
        variant: 'destructive',
      });
      return;
    }

    // Use listing context if available, otherwise first listing
    const targetListingId = listingContext || listings?.[0]?.id;
    if (!targetListingId) {
      toast({
        title: 'No listings available',
        description: 'This host has no active listings to inquire about.',
        variant: 'destructive',
      });
      return;
    }

    setIsMessaging(true);
    try {
      const conversationId = await getOrCreateConversation(targetListingId, actualUserId!);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } finally {
      setIsMessaging(false);
    }
  };

  // Handle view listings click
  const handleViewListingsClick = () => {
    trackEventToDb('view_listings_click', 'engagement', { 
      host_id: actualUserId,
      source: 'profile' 
    });
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle share
  const handleShare = async () => {
    trackEventToDb('share_profile_click', 'engagement', { host_id: actualUserId });
    const url = `${window.location.origin}/u/${profile?.username || actualUserId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} on Vendibook`,
          url,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied!',
        description: 'Profile link copied to clipboard.',
      });
    }
  };

  // Handle report
  const handleReport = () => {
    toast({
      title: 'Report submitted',
      description: 'Thank you for helping keep Vendibook safe. We\'ll review this profile.',
    });
  };

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
        <SEO 
          title="Profile Not Found"
          description="This user profile doesn't exist or is not accessible."
          noindex
        />
        <div className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Profile not found</h1>
          <p className="text-muted-foreground mb-8">This user profile doesn't exist or is not accessible.</p>
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

  const memberSince = new Date(profile.created_at);
  const memberSinceText = memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const seoDescription = `${displayName}${serviceArea ? ` • ${serviceArea}` : ''} on Vendibook. ${isHost ? `${stats?.totalListings || 0} listings available` : 'View profile'}${stats?.averageRating ? ` • ${stats.averageRating.toFixed(1)}★ rating` : ''}.`;

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* ══ FULL-PAGE ANIMATED GRADIENT BACKGROUND (matches homepage) ══ */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-background" />
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-[hsl(14,100%,57%)]/[0.04] blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, -50, 60, 0], y: [0, 40, -40, 0], scale: [1, 0.85, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-32 w-[800px] h-[800px] rounded-full bg-[hsl(40,100%,49%)]/[0.03] blur-[170px]"
        />
        <motion.div
          animate={{ x: [0, 30, -40, 0], y: [0, -30, 50, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[hsl(14,80%,50%)]/[0.03] blur-[130px]"
        />
        <motion.div
          animate={{ x: [0, -25, 35, 0], y: [0, 35, -25, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut', delay: 2 }}
          className="absolute top-2/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(25,95%,55%)]/[0.02] blur-[140px]"
        />
      </div>

      <SEO 
        title={`${displayName} on Vendibook`}
        description={seoDescription}
        canonical={`/u/${profile.username || actualUserId}`}
        image={profile.avatar_url || undefined}
      />
      <div className="relative z-10 flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Enhanced Animated Header */}
        <EnhancedPublicProfileHeader
          profile={profile}
          stats={stats}
          isOwnProfile={isOwnProfile}
          serviceArea={serviceArea}
          responseTime={responseTimeData?.avgResponseTime}
          completedBookings={completedBookings || 0}
          isHost={isHost}
          onMessageHost={handleMessageHost}
          onShare={handleShare}
          onReport={handleReport}
          onShowSafety={() => setShowSafetyModal(true)}
          onViewListings={handleViewListingsClick}
          isMessaging={isMessaging}
          listingContext={listingContext}
          isTopRated={hostBadges.isTopRated}
          isSuperhost={hostBadges.isSuperhost}
        />

        {/* ══ FEATURED LISTING SPOTLIGHT ══ */}
        {isHost && (() => {
          const pinnedListing = profile.pinned_listing_id 
            ? (listings as Listing[] | undefined)?.find(l => l.id === profile.pinned_listing_id)
            : (listings as Listing[] | undefined)?.[0];
          return pinnedListing ? (
            <div className="container py-6">
              <StorefrontFeaturedListing listing={pinnedListing} hostName={displayName} />
            </div>
          ) : null;
        })()}

        {/* ══ TRUST & SOCIAL PROOF STRIP ══ */}
        <div className="container py-4">
          <StorefrontTrustStrip
            isVerified={profile.identity_verified || false}
            responseTime={responseTimeData?.avgResponseTime}
            completedBookings={completedBookings || 0}
            averageRating={stats?.averageRating}
            totalReviews={stats?.totalReviewsReceived}
            memberSince={memberSinceText}
            isTopRated={hostBadges.isTopRated}
            isSuperhost={hostBadges.isSuperhost}
          />
        </div>

        {/* ══ ANIMATED CATEGORY SHOWCASE ══ */}
        {isHost && (
          <div className="container py-4">
            <StorefrontCategoryShowcase listings={listings as Listing[] | undefined} hostName={displayName} />
          </div>
        )}

        {/* Content Section */}
        <motion.div 
          className="container py-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Events Section */}
          {isHost && (
            <StorefrontEventsSection 
              events={hostEvents || []} 
              isLoading={eventsLoading} 
            />
          )}

          {/* Shop Policies */}
          <ShopPoliciesCard 
            policies={profile.shop_policies || null} 
            isOwnProfile={isOwnProfile} 
          />
        </motion.div>

        {/* Enhanced Tabs */}
        <EnhancedPublicProfileTabs
          ref={listingsRef}
          listings={listings as Listing[] | undefined}
          listingsLoading={listingsLoading}
          reviewsReceived={reviewsReceived}
          reviewsGiven={reviewsGiven}
          reviewsReceivedLoading={reviewsReceivedLoading}
          reviewsGivenLoading={reviewsGivenLoading}
          isOwnProfile={isOwnProfile}
          hostVerified={profile.identity_verified || false}
          isHost={isHost}
          hostId={actualUserId}
          stats={stats}
          responseTime={responseTimeData?.avgResponseTime}
          soldListings={soldListings || []}
          soldListingsLoading={soldListingsLoading}
          pinnedListingId={profile.pinned_listing_id}
          onListingClick={(listingId) => {
            trackEventToDb('listing_card_click', 'engagement', { 
              listing_id: listingId,
              host_id: actualUserId,
              source: 'profile' 
            });
          }}
          onMessageHost={handleMessageHost}
          onViewListings={handleViewListingsClick}
        />

        {/* Photo Gallery */}
        {isHost && (
          <motion.div 
            className="container py-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <StorefrontGallerySection 
              listings={listings as Listing[] | undefined} 
              isLoading={listingsLoading}
              hostName={displayName}
            />
          </motion.div>
        )}
      </main>

      {/* ══ MOBILE STICKY CONTACT BAR ══ */}
      {!isOwnProfile && isHost && (
        <StorefrontStickyContact
          onMessage={handleMessageHost}
          onShare={handleShare}
          onViewListings={handleViewListingsClick}
          isMessaging={isMessaging}
          listingsCount={stats?.totalListings || 0}
          listingContext={listingContext}
        />
      )}

      {/* Safety Tips Modal */}
      <Dialog open={showSafetyModal} onOpenChange={setShowSafetyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Safety Tips
            </DialogTitle>
            <DialogDescription>
              Stay safe when renting or buying on Vendibook
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Look for verified hosts</p>
                <p className="text-muted-foreground">Hosts with "Verified ID" have completed identity verification.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MessageCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Communicate on Vendibook</p>
                <p className="text-muted-foreground">Keep all communication on our platform for your protection.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Book through Vendibook</p>
                <p className="text-muted-foreground">Only pay through our secure checkout. Never send money directly.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Flag className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Report suspicious activity</p>
                <p className="text-muted-foreground">If something seems off, report it immediately.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
      </div>
    </div>
  );
};

export default PublicProfile;
