import React from 'react';
import { Check, X, Camera, Type, DollarSign, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityCheckItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  passed: boolean;
  required: boolean;
}

interface ListingQualityGateProps {
  hasPhotos: boolean;
  photoCount: number;
  hasTitle: boolean;
  hasPrice: boolean;
  hasLocation: boolean;
  mode: 'rent' | 'sale' | null;
  className?: string;
}

export const ListingQualityGate: React.FC<ListingQualityGateProps> = ({
  hasPhotos,
  photoCount,
  hasTitle,
  hasPrice,
  hasLocation,
  mode,
  className,
}) => {
  const minPhotos = 3;
  const hasMinPhotos = photoCount >= minPhotos;

  const qualityChecks: QualityCheckItem[] = [
    {
      id: 'photos',
      label: hasMinPhotos 
        ? `${photoCount} photos added` 
        : `Add ${minPhotos - photoCount} more photo${minPhotos - photoCount > 1 ? 's' : ''}`,
      icon: <Camera className="h-4 w-4" />,
      passed: hasMinPhotos,
      required: true,
    },
    {
      id: 'title',
      label: 'Title added',
      icon: <Type className="h-4 w-4" />,
      passed: hasTitle,
      required: true,
    },
    {
      id: 'price',
      label: mode === 'sale' ? 'Sale price set' : 'Daily rate set',
      icon: <DollarSign className="h-4 w-4" />,
      passed: hasPrice,
      required: true,
    },
    {
      id: 'location',
      label: 'Location added',
      icon: <MapPin className="h-4 w-4" />,
      passed: hasLocation,
      required: true,
    },
  ];

  const passedCount = qualityChecks.filter(c => c.passed).length;
  const totalRequired = qualityChecks.filter(c => c.required).length;
  const canPublish = passedCount === totalRequired;

  return (
    <div className={cn("bg-muted/30 rounded-xl p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">Publish requirements</h4>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          canPublish 
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          {passedCount}/{totalRequired} complete
        </span>
      </div>

      <div className="space-y-2">
        {qualityChecks.map((check) => (
          <div
            key={check.id}
            className={cn(
              "flex items-center gap-3 py-2",
              !check.passed && "opacity-70"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
              check.passed 
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}>
              {check.passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </div>
            <span className={cn(
              "text-sm",
              check.passed ? "text-muted-foreground" : "text-foreground"
            )}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {!canPublish && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          Complete all requirements to publish your listing
        </p>
      )}
    </div>
  );
};

export const checkListingQuality = (
  photoCount: number,
  hasTitle: boolean,
  hasPrice: boolean,
  hasLocation: boolean,
  minPhotos: number = 3
): boolean => {
  return photoCount >= minPhotos && hasTitle && hasPrice && hasLocation;
};

export default ListingQualityGate;
