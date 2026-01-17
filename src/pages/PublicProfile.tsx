import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Image, Loader2, ShieldCheck, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProfileListingsTab from '@/components/profile/ProfileListingsTab';
import ProfileReviewsTab from '@/components/profile/ProfileReviewsTab';
import ProfilePhotosTab from '@/components/profile/ProfilePhotosTab';
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

// Hook to fetch public profile data only
const usePublicProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Use the secure function that only returns safe public fields
      const { data, error } = await supabase.rpc('get_safe_host_profile', {
        host_user_id: userId
      });

      if (error) throw error;
      
      const profile = data?.[0];
      if (!profile) {
        // Fallback: try direct query with limited fields
        const { data: directData, error: directError } = await supabase
          .from('profiles')
          .select('id, full_name, display_name, username, business_name, public_city, public_state, avatar_url, identity_verified, created_at')
          .eq('id', userId)
          .single();
        
        if (directError) throw directError;
        return directData;
      }

      return profile;
    },
    enabled: !!userId,
  });
};

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  
  const isOwnProfile = user?.id === userId;

  // Profile data hooks
  const { data: profile, isLoading: profileLoading } = usePublicProfile(userId);
  const { data: stats, isLoading: statsLoading } = useUserStats(userId);
  const { data: listings, isLoading: listingsLoading } = useUserListings(userId);
  const { data: reviewsReceived, isLoading: reviewsReceivedLoading } = useUserReviewsReceived(userId);
  const { data: reviewsGiven, isLoading: reviewsGivenLoading } = useUserReviewsGiven(userId);
  const { data: responseTimeData } = useHostResponseTime(userId);

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
        {/* Compact Profile Header */}
        <div className="border-b bg-card">
          <div className="container py-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar className="h-20 w-20 border-2 border-border">
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

              {/* Name & Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-foreground truncate">
                    {displayName}
                  </h1>
                  {isOwnProfile && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
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

                {(profile.public_city || profile.public_state) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {[profile.public_city, profile.public_state].filter(Boolean).join(', ')}
                    </span>
                  </p>
                )}

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.identity_verified && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-500/50 text-emerald-600 bg-emerald-50/50">
                      <ShieldCheck className="h-3 w-3 mr-0.5" />
                      Verified
                    </Badge>
                  )}
                  {isHost && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      Host
                    </Badge>
                  )}
                  {stats?.averageRating && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/50 text-amber-600 bg-amber-50/50">
                      <Star className="h-3 w-3 mr-0.5 fill-amber-500" />
                      {stats.averageRating.toFixed(1)}
                    </Badge>
                  )}
                  {responseTimeData?.isFastResponder && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-500/50 text-blue-600 bg-blue-50/50">
                      <Clock className="h-3 w-3 mr-0.5" />
                      Fast Responder
                    </Badge>
                  )}
                </div>

                {/* Member Since */}
                <p className="text-xs text-muted-foreground mt-2">
                  Member since {new Date(profile.created_at).getFullYear()}
                </p>
              </div>
            </div>

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
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="container py-6">
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

            {/* Photos Tab */}
            <TabsContent value="photos" className="mt-0">
              <ProfilePhotosTab
                listings={listings as Listing[] | undefined}
                isLoading={listingsLoading}
                isOwnProfile={false}
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