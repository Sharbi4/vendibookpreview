import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StarRating from './StarRating';
import { useCreateReview } from '@/hooks/useReviews';

interface ReviewFormProps {
  bookingId: string;
  listingId: string;
  hostId: string;
  onSuccess?: () => void;
}

const ReviewForm = ({ bookingId, listingId, hostId, onSuccess }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const createReview = useCreateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }

    await createReview.mutateAsync({
      bookingId,
      listingId,
      hostId,
      rating,
      reviewText: reviewText.trim() || undefined,
    });

    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leave a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Rating</label>
            <StarRating
              rating={rating}
              size="lg"
              interactive
              onRatingChange={setRating}
            />
            {rating === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Click to rate</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Review <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
            />
          </div>

          <Button
            type="submit"
            disabled={rating === 0 || createReview.isPending}
            className="w-full"
          >
            {createReview.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
