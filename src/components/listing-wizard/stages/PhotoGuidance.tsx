import React from 'react';
import { Camera, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPhotoPrompts, MIN_GUIDED_PHOTOS } from '@/lib/listings/stages';
import type { ListingCategory } from '@/types/listing';

export interface PhotoGuidanceProps {
  category: ListingCategory;
  photoCount: number;
  hasDisclosedProblems: boolean;
  className?: string;
}

/**
 * Guided minimum photo set for stage 4. It is guidance plus a visible
 * requirement statement — it does not replace the wizard's upload, compression,
 * ordering or cover-selection behaviour.
 */
export const PhotoGuidance: React.FC<PhotoGuidanceProps> = ({
  category,
  photoCount,
  hasDisclosedProblems,
  className,
}) => {
  const prompts = getPhotoPrompts(category).filter(
    (p) => hasDisclosedProblems || !p.startsWith('Any disclosed damage'),
  );
  const met = photoCount >= MIN_GUIDED_PHOTOS;

  return (
    <div className={cn('rounded-xl border border-border bg-card/40 p-4', className)}>
      <div className="flex items-start gap-3">
        <Camera className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Photos that sell</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear photos help buyers understand the layout, equipment, condition, and overall
            value before scheduling a viewing.
          </p>

          <p
            className={cn(
              'mt-3 text-sm font-medium',
              met ? 'text-muted-foreground' : 'text-foreground',
            )}
            role="status"
          >
            {met ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" aria-hidden="true" />
                Minimum met — {photoCount} photo{photoCount === 1 ? '' : 's'} added
              </span>
            ) : (
              `Required: at least ${MIN_GUIDED_PHOTOS} photos (${photoCount} added)`
            )}
          </p>

          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {prompts.map((p) => (
              <li key={p} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-muted-foreground">
            JPG, PNG, WEBP or HEIC up to 10MB each. If an upload fails you can retry that file
            without losing the others. Never use editing to hide damage, remove disclosed issues,
            or add equipment that is not included.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoGuidance;
