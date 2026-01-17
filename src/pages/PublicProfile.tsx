import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Image, Loader2, ShieldCheck, Building2, Clock, MessageCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Listing } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';
import { useConversations } from '@/hooks/useConversations';
import { useState, useRef } from 'react';

// Type for public profile data returned by get_safe_host_profile
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

// Hook to fetch public profile data only - NEVER returns private info
const usePublicProfile = (userId: string | undefined) => {
  return useQuery<PublicProfileData | null>({
    queryKey: ['public-profile', userId],
    queryFn: async (): Promise<PublicProfileData | null> => {
      if (!userId) return null;

      // Use the secure function that only returns safe public fields
      const { data, error } = await supabase.rpc('get_safe_host_profile', {
        host_user_id: userId
      });

      if (error) throw error;
      
      const profile = data?.[0];
      if (!profile) {
        // Fallback: try direct query with ONLY public fields
        const { data: directData, error: directError } = await supabase
          .from('profiles')
          .select('id, full_name, display_name, username, business_name, public_city, public_state, avatar_url, identity_verified, created_at')
          .eq('id', userId)
          .single();
        
        if (directError) throw directError;
        return directData as unknown as PublicProfileData;
      }

      return profile as unknown as PublicProfileData;
    },
    enabled: !!userId,
  });
};

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreateConversation } = useConversations();
  const [isMessaging, setIsMessaging] = useState(false);
  const listingsRef = useRef<HTMLDivElement>(null);
  
  const isOwnProfile = user?.id === userId;

  // Profile data hooks - cast to our interface to handle Supabase generated types
  const { data: profileData, isLoading: profileLoading } = usePublicProfile(userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any;
  const { data: stats, isLoading: statsLoading } = useUserStats(userId);
  const { data: listings, isLoading: listingsLoading } = useUserListings(userId);
  const { data: reviewsReceived, isLoading: reviewsReceivedLoading } = useUserReviewsReceived(userId);
  const { data: reviewsGiven, isLoading: reviewsGivenLoading } = useUserReviewsGiven(userId);
  const { data: responseTimeData } = useHostResponseTime(userId);
  
  // Check if host has stripe connected (for payouts badge)
  const { data: stripeData } = useQuery({
    queryKey: ['public-stripe-status', userId],
    queryFn: async () => {
      if (!userId) return null;
      // We check if they have any published listings - implies payouts enabled
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', userId)
        .eq('status', 'published');
      return { hasPayouts: (count || 0) > 0 };
    },
    enabled: !!userId,
  });

  const isLoading = profileLoading || statsLoading;
  const isHost = (stats?.totalListings || 0) > 0;

  // Get display name (prefer display_name, fallback to full_name)
  const displayName = profile?.display_name || profile?.full_name || 'User';
  const initials = displayName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  // Handle message host
  const handleMessageHost = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to message this host.',
      });
      navigate('/auth', { state: { from: `/u/${userId}` } });
      return;
    }

    if (user.id === userId) {
      toast({
        title: 'Cannot message yourself',
        variant: 'destructive',
      });
      return;
    }

    // Get first listing to create conversation context
    const firstListing = listings?.[0];
    if (!firstListing) {
      toast({
        title: 'No listings available',
        description: 'This host has no active listings to inquire about.',
        variant: 'destructive',
      });
      return;
    }

    setIsMessaging(true);
    try {
      const conversationId = await getOrCreateConversation(firstListing.id, userId!);
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } finally {
      setIsMessaging(false);
    }
  };

  // Scroll to listings
  const scrollToListings = () => {
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const location = [profile.public_city, profile.public_state].filter(Boolean).join(', ');
  const seoDescription = `${displayName}${location ? ` from ${location}` : ''} on Vendibook. ${isHost ? `Browse ${stats?.totalListings || 0} listings` : 'View profile'}${stats?.averageRating ? ` • ${stats.averageRating.toFixed(1)} rating` : ''}.`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title={`${displayName} on Vendibook`}
        description={seoDescription}
        canonical={`/u/${userId}`}
        image={profile.avatar_url || undefined}
      />
      <Header />

      <main className="flex-1">
        {/* Mobile-First Profile Header */}
        <div className="border-b bg-card">
          <div className="container py-6">
            {/* Above the fold - Avatar + Name + Badges + CTAs */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Avatar */}
              <div className="flex items-start gap-4 sm:gap-0">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-border">
                    <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {profile.identity_verified && (
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-background rounded-full p-0.5 shadow-sm">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                  )}
                </div>

                {/* Mobile: Name next to avatar */}
                <div className="sm:hidden flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">
                    {displayName}
                  </h1>
                  {profile.business_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{profile.business_name}</span>
                    </p>
                  )}
                  {location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{location}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Desktop: Name & Info */}
              <div className="hidden sm:block flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {displayName}
                  </h1>
                  {isOwnProfile && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link to="/account">Edit</Link>
                    </Button>
                  )}
                </div>

                {profile.business_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{profile.business_name}</span>
                  </p>
                )}

                {location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{location}</span>
                  </p>
                )}

                {/* Desktop Trust Badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.identity_verified && (
                    <Badge variant="outline" className="text-xs h-6 px-2 border-emerald-500/50 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                      Verified ID
                    </Badge>
                  )}
                  {responseTimeData?.isFastResponder && (
                    <Badge variant="outline" className="text-xs h-6 px-2 border-blue-500/50 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Fast Responder
                    </Badge>
                  )}
                  {stripeData?.hasPayouts && (
                    <Badge variant="outline" className="text-xs h-6 px-2 border-purple-500/50 text-purple-600 bg-purple-50/50 dark:bg-purple-950/20">
                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                      Payouts Enabled
                    </Badge>
                  )}
                  {stats?.averageRating && (
                    <Badge variant="outline" className="text-xs h-6 px-2 border-amber-500/50 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                      <Star className="h-3.5 w-3.5 mr-1 fill-amber-500" />
                      {stats.averageRating.toFixed(1)} Rating
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Member since {new Date(profile.created_at).getFullYear()}
                </p>
              </div>
            </div>

            {/* Mobile Trust Badges - full width row */}
            <div className="sm:hidden flex flex-wrap gap-1.5 mt-4">
              {profile.identity_verified && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-500/50 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <ShieldCheck className="h-3 w-3 mr-0.5" />
                  Verified ID
                </Badge>
              )}
              {responseTimeData?.isFastResponder && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-500/50 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20">
                  <Clock className="h-3 w-3 mr-0.5" />
                  Fast Responder
                </Badge>
              )}
              {stripeData?.hasPayouts && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-purple-500/50 text-purple-600 bg-purple-50/50 dark:bg-purple-950/20">
                  <CreditCard className="h-3 w-3 mr-0.5" />
                  Payouts
                </Badge>
              )}
              {stats?.averageRating && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/50 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                  <Star className="h-3 w-3 mr-0.5 fill-amber-500" />
                  {stats.averageRating.toFixed(1)}
                </Badge>
              )}
            </div>

            {/* Mobile: Member since */}
            <p className="sm:hidden text-xs text-muted-foreground mt-2">
              Member since {new Date(profile.created_at).getFullYear()}
            </p>

            {/* CTAs - Mobile & Desktop */}
            {!isOwnProfile && isHost && (
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleMessageHost}
                  disabled={isMessaging}
                  className="flex-1 sm:flex-none"
                >
                  {isMessaging ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4 mr-2" />
                  )}
                  Message Host
                </Button>
                <Button 
                  variant="outline" 
                  onClick={scrollToListings}
                  className="flex-1 sm:flex-none"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  View Listings
                </Button>
              </div>
            )}

            {isOwnProfile && (
              <div className="flex gap-2 mt-4 sm:hidden">
                <Button variant="outline" className="flex-1" asChild>
                  <Link to="/account">Edit Profile</Link>
                </Button>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats?.totalListings || 0}</p>
                <p className="text-xs text-muted-foreground">Listings</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats?.totalReviewsReceived || 0}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
              {stats?.averageRating && (
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              )}
              {responseTimeData?.avgResponseTime && (
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {responseTimeData.avgResponseTime}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div ref={listingsRef} className="container py-6">
          {/* Tabs - Only Listings and Reviews (removed Photos for simplicity) */}
          <Tabs defaultValue="listings" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <TabsTrigger value="listings" className="gap-1.5 text-sm">
                <MapPin className="h-4 w-4" />
                Listings
                {(stats?.totalListings || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({stats?.totalListings})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-sm">
                <Star className="h-4 w-4" />
                Reviews
                {(stats?.totalReviewsReceived || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({stats?.totalReviewsReceived})</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Listings Tab */}
            <TabsContent value="listings" className="mt-0">
              <ProfileListingsTab
                listings={listings as Listing[] | undefined}
                isLoading={listingsLoading}
                isOwnProfile={false}
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
                isOwnProfile={false}
                isHost={isHost}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicProfile;