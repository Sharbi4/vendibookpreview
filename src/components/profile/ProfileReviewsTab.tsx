import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Loader2, MessageCircle, MapPin, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StarRating from '@/components/reviews/StarRating';

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  listing_id: string;
  reviewer_name?: string;
  listing_title?: string;
  host_name?: string;
}

interface ProfileReviewsTabProps {
  reviewsReceived: Review[] | undefined;
  reviewsGiven: Review[] | undefined;
  isLoadingReceived: boolean;
  isLoadingGiven: boolean;
  isOwnProfile: boolean;
  isHost: boolean;
  responseTime?: string | null;
  listingsCount?: number;
  onMessageHost?: () => void;
  onViewListings?: () => void;
}

const ProfileReviewsTab = ({
  reviewsReceived,
  reviewsGiven,
  isLoadingReceived,
  isLoadingGiven,
  isOwnProfile,
  isHost,
  responseTime,
  listingsCount = 0,
  onMessageHost,
  onViewListings,
}: ProfileReviewsTabProps) => {
  const ReviewCard = ({ review, type }: { review: Review; type: 'received' | 'given' }) => (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {type === 'received' && (
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {review.reviewer_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-sm text-foreground truncate">
                {type === 'received' ? review.reviewer_name : review.listing_title}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            {type === 'received' && review.listing_title && (
              <Link 
                to={`/listing/${review.listing_id}`}
                className="text-xs text-primary hover:underline"
              >
                {review.listing_title}
              </Link>
            )}
            {type === 'given' && review.host_name && (
              <p className="text-xs text-muted-foreground">Host: {review.host_name}</p>
            )}
            <div className="mt-1">
              <StarRating rating={review.rating} size="sm" />
            </div>
            {review.review_text && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {review.review_text}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Actionable empty state that drives conversions
  const EmptyReviewsState = ({ type }: { type: 'received' | 'given' }) => {
    const showActionableCTA = type === 'received' && !isOwnProfile && isHost;
    
    return (
      <div className="text-center py-8 px-4 bg-muted/30 rounded-lg">
        <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">No reviews yet</p>
        
        {showActionableCTA ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {responseTime 
                ? `This host responds in ~${responseTime} and has ${listingsCount} active listing${listingsCount !== 1 ? 's' : ''}.`
                : `This host has ${listingsCount} active listing${listingsCount !== 1 ? 's' : ''}.`}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              {onViewListings && (
                <Button variant="outline" size="sm" onClick={onViewListings}>
                  <MapPin className="h-4 w-4 mr-1.5" />
                  View listings
                </Button>
              )}
              {onMessageHost && (
                <Button size="sm" onClick={onMessageHost}>
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Message host
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {type === 'received' 
              ? isHost 
                ? 'Complete your first booking to earn reviews.'
                : 'No reviews received yet.'
              : 'Reviews appear after completed transactions.'}
          </p>
        )}
      </div>
    );
  };

  // Calculate rating summary
  const ratingSummary = reviewsReceived && reviewsReceived.length > 0 ? {
    average: reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length,
    count: reviewsReceived.length,
    distribution: [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: reviewsReceived.filter(r => r.rating === rating).length,
      percentage: (reviewsReceived.filter(r => r.rating === rating).length / reviewsReceived.length) * 100
    }))
  } : null;

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {ratingSummary && (
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{ratingSummary.average.toFixed(1)}</p>
              <div className="flex justify-center mt-1">
                <StarRating rating={ratingSummary.average} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{ratingSummary.count} reviews</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingSummary.distribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-muted-foreground">{rating}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-6 text-muted-foreground text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews Received */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Reviews ({reviewsReceived?.length || 0})
        </h3>
        {isLoadingReceived ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : reviewsReceived && reviewsReceived.length > 0 ? (
          <div className="grid gap-3">
            {reviewsReceived.map((review) => (
              <ReviewCard key={review.id} review={review} type="received" />
            ))}
          </div>
        ) : (
          <EmptyReviewsState type="received" />
        )}
      </div>

      {/* Reviews Given - Only show for own profile */}
      {isOwnProfile && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Reviews Given ({reviewsGiven?.length || 0})
          </h3>
          {isLoadingGiven ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reviewsGiven && reviewsGiven.length > 0 ? (
            <div className="grid gap-3">
              {reviewsGiven.map((review) => (
                <ReviewCard key={review.id} review={review} type="given" />
              ))}
            </div>
          ) : (
            <EmptyReviewsState type="given" />
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileReviewsTab;