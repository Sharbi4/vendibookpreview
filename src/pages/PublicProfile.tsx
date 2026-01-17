import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Star, Loader2, ShieldCheck, Building2, Clock, 
  MessageCircle, MoreHorizontal, Share2, Flag, ShieldAlert, Calendar,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProfileListingsTab from '@/components/profile/ProfileListingsTab';
import ProfileReviewsTab from '@/components/profile/ProfileReviewsTab';
import SEO from '@/components/SEO';
import { 
  useUserStats, 
  useUserListings,
  useUserReviewsReceived,
  useUserReviewsGiven
} from '@/hooks/useUserProfile';
import { useHostResponseTime } from '@/hooks/useHostResponseTime';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Listing } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';
import { useConversations } from '@/hooks/useConversations';
import { useState, useRef, useEffect } from 'react';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

// Type for public profile data
interface PublicProfileData {
  id: string;
  full_name: string | null;
  display_name: string | null;
  username: string | null;
  business_name: string | null;
  public_city: string | null;
  public_state: string | null;
  avatar_url: string | null;
  identity_verified: boolean;
  created_at: string;
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
          .select('id, full_name, display_name, username, business_name, public_city, public_state, avatar_url, identity_verified, created_at')
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
          .select('id, full_name, display_name, username, business_name, public_city, public_state, avatar_url, identity_verified, created_at')
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

  const isLoading = profileLoading || statsLoading;
  const isHost = (stats?.totalListings || 0) > 0;

  // Display name logic
  const displayName = profile?.display_name || profile?.full_name || 'User';
  const initials = displayName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

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
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title={`${displayName} on Vendibook`}
        description={seoDescription}
        canonical={`/u/${profile.username || actualUserId}`}
        image={profile.avatar_url || undefined}
      />
      <Header />

      <main className="flex-1 pb-24 md:pb-0">
        {/* Section 1: Header with Desktop CTA */}
        <div className="border-b bg-card">
          <div className="container py-5 md:py-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
              {/* Left: Profile Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-border">
                    <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {profile.identity_verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-sm border border-border">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
                        {displayName}
                      </h1>
                      {profile.business_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{profile.business_name}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span>{serviceArea || 'Service area not set'}</span>
                      </p>
                    </div>

                    {/* Overflow Menu - Mobile only position */}
                    <div className="md:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={handleShare}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share profile
                          </DropdownMenuItem>
                          {!isOwnProfile && (
                            <DropdownMenuItem onClick={handleReport}>
                              <Flag className="h-4 w-4 mr-2" />
                              Report profile
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setShowSafetyModal(true)}>
                            <ShieldAlert className="h-4 w-4 mr-2" />
                            Safety tips
                          </DropdownMenuItem>
                          {isOwnProfile && (
                            <DropdownMenuItem onClick={() => navigate('/account')}>
                              <Eye className="h-4 w-4 mr-2" />
                              Edit profile
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Trust Pills - Max 4 */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.identity_verified ? (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-500/50 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3 mr-0.5" />
                        Verified ID
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-muted text-muted-foreground">
                        Not verified
                      </Badge>
                    )}
                    {responseTimeData?.avgResponseTime && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-500/50 text-blue-700 bg-blue-50/50 dark:bg-blue-950/20 dark:text-blue-400">
                        <Clock className="h-3 w-3 mr-0.5" />
                        ~{responseTimeData.avgResponseTime}
                      </Badge>
                    )}
                    {(completedBookings || 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-purple-500/50 text-purple-700 bg-purple-50/50 dark:bg-purple-950/20 dark:text-purple-400">
                        <Calendar className="h-3 w-3 mr-0.5" />
                        {completedBookings} completed
                      </Badge>
                    )}
                    {stats?.averageRating && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/50 text-amber-700 bg-amber-50/50 dark:bg-amber-950/20 dark:text-amber-400">
                        <Star className="h-3 w-3 mr-0.5 fill-amber-500" />
                        {stats.averageRating.toFixed(1)} ({stats.totalReviewsReceived})
                      </Badge>
                    )}
                  </div>

                  {/* Member since */}
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Member since {memberSinceText}
                  </p>
                </div>
              </div>

              {/* Right: Desktop CTA Block + Overflow Menu */}
              <div className="hidden md:flex flex-col items-end gap-3 flex-shrink-0">
                {/* Overflow Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share profile
                    </DropdownMenuItem>
                    {!isOwnProfile && (
                      <DropdownMenuItem onClick={handleReport}>
                        <Flag className="h-4 w-4 mr-2" />
                        Report profile
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowSafetyModal(true)}>
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      Safety tips
                    </DropdownMenuItem>
                    {isOwnProfile && (
                      <DropdownMenuItem onClick={() => navigate('/account')}>
                        <Eye className="h-4 w-4 mr-2" />
                        Edit profile
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* CTA Buttons */}
                {!isOwnProfile && isHost && (
                  <div className="flex flex-col gap-2 w-48">
                    <Button onClick={handleMessageHost} disabled={isMessaging} className="w-full">
                      {isMessaging ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mr-2" />
                      )}
                      {listingContext ? 'Message about listing' : 'Message Host'}
                    </Button>
                    <Button variant="outline" onClick={handleViewListingsClick} className="w-full">
                      View Listings ({stats?.totalListings || 0})
                    </Button>
                  </div>
                )}

                {isOwnProfile && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/account">Edit profile</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 & 4: Listings & Reviews Tabs */}
        <div ref={listingsRef} className="container py-5">
          <Tabs defaultValue="listings" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted/50 p-1 rounded-lg h-10">
              <TabsTrigger value="listings" className="gap-1.5 text-sm rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <MapPin className="h-4 w-4" />
                Listings
                {(stats?.totalListings || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({stats?.totalListings})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-sm rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Star className="h-4 w-4" />
                Reviews
                {(stats?.totalReviewsReceived || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({stats?.totalReviewsReceived})</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listings" className="mt-0">
              <ProfileListingsTab
                listings={listings as Listing[] | undefined}
                isLoading={listingsLoading}
                isOwnProfile={isOwnProfile}
                hostVerified={profile.identity_verified || false}
                hostId={actualUserId}
                onListingClick={(listingId) => {
                  trackEventToDb('listing_card_click', 'engagement', { 
                    listing_id: listingId,
                    host_id: actualUserId,
                    source: 'profile' 
                  });
                }}
              />
            </TabsContent>

            <TabsContent value="reviews" className="mt-0">
              <ProfileReviewsTab
                reviewsReceived={reviewsReceived}
                reviewsGiven={reviewsGiven}
                isLoadingReceived={reviewsReceivedLoading}
                isLoadingGiven={reviewsGivenLoading}
                isOwnProfile={isOwnProfile}
                isHost={isHost}
                responseTime={responseTimeData?.avgResponseTime}
                listingsCount={stats?.totalListings || 0}
                onMessageHost={handleMessageHost}
                onViewListings={handleViewListingsClick}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Section 2: Mobile Sticky CTA */}
      {!isOwnProfile && isHost && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 z-40 safe-area-inset-bottom">
          <div className="flex gap-2 max-w-lg mx-auto">
            <Button 
              onClick={handleMessageHost} 
              disabled={isMessaging}
              className="flex-1 h-11"
            >
              {isMessaging ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              {listingContext ? 'Message about listing' : 'Message Host'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleViewListingsClick}
              className="flex-1 h-11"
            >
              Listings ({stats?.totalListings || 0})
            </Button>
          </div>
        </div>
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
  );
};

export default PublicProfile;
