import React, { useMemo, useEffect, useRef } from 'react';
import { MapPin, DollarSign, Tag, Calendar, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { ListingFormData, CATEGORY_LABELS, MODE_LABELS } from '@/types/listing';
import { cn } from '@/lib/utils';

interface StepReviewProps {
  formData: ListingFormData;
  canPublish: boolean;
}

export const StepReview: React.FC<StepReviewProps> = ({
  formData,
  canPublish,
}) => {
  // Track object URL for cleanup
  const previewUrlRef = useRef<string | null>(null);

  const previewImage = useMemo(() => {
    // Clean up previous object URL if it exists
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (formData.images.length > 0) {
      const url = URL.createObjectURL(formData.images[0]);
      previewUrlRef.current = url;
      return url;
    }
    if (formData.existingImages.length > 0) {
      return formData.existingImages[0];
    }
    return null;
  }, [formData.images, formData.existingImages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return null;
    const num = parseFloat(price);
    return isNaN(num) ? null : num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const location = formData.address || formData.pickup_location_text || 'Location not set';

  const totalPhotos = formData.images.length + formData.existingImages.length;
  const minPhotos = 3;

  const issues: string[] = [];
  if (!formData.mode) issues.push('Listing mode not selected');
  if (!formData.category) issues.push('Category not selected');
  if (!formData.title.trim() || formData.title.trim().length < 5) issues.push('Title is required (min 5 characters)');
  if (!formData.description.trim()) issues.push('Description is required');
  if (formData.mode === 'rent' && !formData.price_daily) issues.push('Daily price is required');
  if (formData.mode === 'sale' && !formData.price_sale) issues.push('Sale price is required');
  if (formData.mode === 'sale' && !formData.accept_cash_payment && !formData.accept_paypal_checkout) {
    issues.push('At least one payment method is required (PayPal checkout or Pay in Person)');
  }
  if (totalPhotos < minPhotos) issues.push(`Minimum ${minPhotos} photos required (${totalPhotos} added)`);
  if (!formData.address && !formData.pickup_location_text) issues.push('Location is required');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Listing</h3>
        <p className="text-sm text-muted-foreground">
          Make sure everything looks good before publishing.
        </p>
      </div>

      {/* Preview Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Cover Image */}
        {previewImage ? (
          <div className="aspect-video bg-muted">
            <img
              src={previewImage}
              alt="Listing preview"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">No image</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold line-clamp-2">
                {formData.title || 'Untitled Listing'}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{location}</span>
              </div>
            </div>
            
            {/* Price */}
            <div className="text-right shrink-0">
              {formData.mode === 'rent' ? (
                <>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(formData.price_daily) || '$--'}
                  </div>
                  <div className="text-sm text-muted-foreground">per day</div>
                </>
              ) : (
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(formData.price_sale) || '$--'}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.category && (
              <span className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
                {CATEGORY_LABELS[formData.category]}
              </span>
            )}
            {formData.mode && (
              <span className={cn(
                "px-3 py-1 text-sm rounded-full",
                formData.mode === 'rent' 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-green-100 text-green-700"
              )}>
                {MODE_LABELS[formData.mode]}
              </span>
            )}
          </div>

          {/* Description Preview */}
          <p className="text-muted-foreground line-clamp-3">
            {formData.description || 'No description provided.'}
          </p>

          {/* Highlights */}
          {formData.highlights.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <ul className="space-y-1">
                {formData.highlights.slice(0, 3).map((highlight, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-3">
          {/* Other issues */}
          {issues.filter(i => Boolean(i)).length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertCircle className="w-5 h-5" />
                Cannot Publish
              </div>
              <ul className="space-y-1 text-sm text-destructive/80">
                {issues.filter(i => Boolean(i)).map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {issues.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-green-700 dark:text-green-300 font-medium">
            Your listing is ready to publish!
          </p>
        </div>
      )}
    </div>
  );
};
