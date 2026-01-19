import { forwardRef } from 'react';
import { Star } from 'lucide-react';
import { useListingAverageRating } from '@/hooks/useReviews';

interface RatingBadgeProps {
  listingId: string;
}

const RatingBadge = forwardRef<HTMLDivElement, RatingBadgeProps>(
  function RatingBadge({ listingId }, ref) {
    const { data: ratingData, isLoading } = useListingAverageRating(listingId);

    if (isLoading || !ratingData) {
      return null;
    }

    return (
      <div ref={ref} className="flex items-center gap-1 text-sm">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="font-medium">{ratingData.average}</span>
        <span className="text-muted-foreground">({ratingData.count})</span>
      </div>
    );
  }
);

export default RatingBadge;
