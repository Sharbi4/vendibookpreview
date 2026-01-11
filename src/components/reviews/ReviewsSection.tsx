import { useListingReviews, useListingAverageRating } from '@/hooks/useReviews';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';
import { Skeleton } from '@/components/ui/skeleton';

interface ReviewsSectionProps {
  listingId: string;
}

const ReviewsSection = ({ listingId }: ReviewsSectionProps) => {
  const { data: reviews, isLoading: reviewsLoading } = useListingReviews(listingId);
  const { data: ratingData } = useListingAverageRating(listingId);

  if (reviewsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {ratingData && (
        <div className="flex items-center gap-3">
          <StarRating rating={Math.round(ratingData.average)} size="md" />
          <span className="text-lg font-semibold">{ratingData.average}</span>
          <span className="text-muted-foreground">
            ({ratingData.count} review{ratingData.count !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
};

export default ReviewsSection;
