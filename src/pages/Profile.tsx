import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  User,
  Star,
  MapPin,
  Calendar,
  Shield,
  Image,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import StarRating from '@/components/reviews/StarRating';
import ListingCard from '@/components/listing/ListingCard';
import { 
  useUserProfile, 
  useUserStats, 
  useUserListings,
  useUserReviewsReceived,
  useUserReviewsGiven
} from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Listing } from '@/types/listing';

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // If no ID provided, show current user's profile
  const profileUserId = id || user?.id;
  const isOwnProfile = user?.id === profileUserId;

  const { data: profile, isLoading: profileLoading } = useUserProfile(profileUserId);
  const { data: stats, isLoading: statsLoading } = useUserStats(profileUserId);
  const { data: listings, isLoading: listingsLoading } = useUserListings(profileUserId);
  const { data: reviewsReceived, isLoading: reviewsReceivedLoading } = useUserReviewsReceived(profileUserId);
  const { data: reviewsGiven, isLoading: reviewsGivenLoading } = useUserReviewsGiven(profileUserId);

  const isLoading = profileLoading || statsLoading;

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

  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');

  // Collect all photos from listings
  const allPhotos = listings?.flatMap(listing => {
    const photos: { url: string; listingId: string; listingTitle: string }[] = [];
    if (listing.cover_image_url) {
      photos.push({ 
        url: listing.cover_image_url, 
        listingId: listing.id, 
        listingTitle: listing.title 
      });
    }
    if (listing.image_urls) {
      listing.image_urls.forEach(url => {
        photos.push({ 
          url, 
          listingId: listing.id, 
          listingTitle: listing.title 
        });
      });
    }
    return photos;
  }) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-primary/10 to-background py-12">
          <div className="container">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
                <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {profile.full_name || 'User'}
                  </h1>
                  {profile.identity_verified && (
                    <Badge variant="secondary" className="gap-1 w-fit mx-auto md:mx-0">
                      <Shield className="h-3 w-3 text-emerald-600" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Member since {memberSince}
                  </div>
                  {stats?.averageRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {stats.averageRating} ({stats.totalReviewsReceived} reviews)
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap justify-center md:justify-start gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{stats?.totalListings || 0}</p>
                    <p className="text-sm text-muted-foreground">Listings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{stats?.totalReviewsReceived || 0}</p>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{allPhotos.length}</p>
                    <p className="text-sm text-muted-foreground">Photos</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isOwnProfile && (
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/profile/edit">Edit Profile</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="container py-8">
          <Tabs defaultValue="listings" className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-8">
              <TabsTrigger value="listings" className="gap-2">
                <MapPin className="h-4 w-4" />
                Listings
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-2">
                <Image className="h-4 w-4" />
                Photos
              </TabsTrigger>
            </TabsList>

            {/* Listings Tab */}
            <TabsContent value="listings">
              {listingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : listings && listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {listings.map((listing) => (
                    <Link key={listing.id} to={`/listing/${listing.id}`}>
                      <ListingCard listing={listing as Listing} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No listings yet</p>
                </div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <div className="space-y-8">
                {/* Reviews Received */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Reviews Received ({reviewsReceived?.length || 0})
                  </h3>
                  {reviewsReceivedLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : reviewsReceived && reviewsReceived.length > 0 ? (
                    <div className="grid gap-4">
                      {reviewsReceived.map((review) => (
                        <Card key={review.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {review.reviewer_name?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {review.reviewer_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(review.created_at), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                <Link 
                                  to={`/listing/${review.listing_id}`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {review.listing_title}
                                </Link>
                                <div className="mt-1">
                                  <StarRating rating={review.rating} size="sm" />
                                </div>
                                {review.review_text && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {review.review_text}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted/30 rounded-lg">
                      <Star className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-muted-foreground">No reviews received yet</p>
                    </div>
                  )}
                </div>

                {/* Reviews Given - Only show for own profile */}
                {isOwnProfile && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Reviews Given ({reviewsGiven?.length || 0})
                    </h3>
                    {reviewsGivenLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : reviewsGiven && reviewsGiven.length > 0 ? (
                      <div className="grid gap-4">
                        {reviewsGiven.map((review) => (
                          <Card key={review.id}>
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <Link 
                                      to={`/listing/${review.listing_id}`}
                                      className="font-medium text-sm hover:text-primary"
                                    >
                                      {review.listing_title}
                                    </Link>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(review.created_at), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Host: {review.host_name}
                                  </p>
                                  <StarRating rating={review.rating} size="sm" />
                                  {review.review_text && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      {review.review_text}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-muted/30 rounded-lg">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-muted-foreground">No reviews given yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos">
              {listingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : allPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allPhotos.map((photo, index) => (
                    <Link 
                      key={`${photo.listingId}-${index}`}
                      to={`/listing/${photo.listingId}`}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
                    >
                      <img
                        src={photo.url}
                        alt={photo.listingTitle}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium line-clamp-2">
                            {photo.listingTitle}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Image className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No photos yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
