import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
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
}

const ProfileReviewsTab = ({
  reviewsReceived,
  reviewsGiven,
  isLoadingReceived,
  isLoadingGiven,
  isOwnProfile,
  isHost,
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

  const EmptyReviewsState = ({ type }: { type: 'received' | 'given' }) => (
    <div className="text-center py-8 px-4 bg-muted/30 rounded-lg">
      <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">
        {type === 'received' 
          ? isHost 
            ? 'Complete your first booking to earn reviews.'
            : 'No reviews received yet.'
          : 'Reviews appear after completed transactions.'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Reviews Received */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          Reviews Received ({reviewsReceived?.length || 0})
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
