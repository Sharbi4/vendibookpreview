import React from 'react';
import { Truck, Store, Building2, MapPin, Tag, ShoppingBag } from 'lucide-react';
import { ListingFormData, ListingMode, ListingCategory, CATEGORY_LABELS } from '@/types/listing';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface StepListingTypeProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  updateCategory: (category: ListingCategory) => void;
}

const modeOptions: { value: ListingMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'rent', label: 'For Rent', icon: <Tag className="w-6 h-6" />, description: 'Rent out your asset by the day or week' },
  { value: 'sale', label: 'For Sale', icon: <ShoppingBag className="w-6 h-6" />, description: 'Sell your asset to a new owner' },
];

const categoryOptions: { value: ListingCategory; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'food_truck', label: 'Food Truck', icon: <Truck className="w-6 h-6" />, description: 'Mobile kitchen on wheels' },
  { value: 'food_trailer', label: 'Food Trailer', icon: <Truck className="w-6 h-6" />, description: 'Towable food service unit' },
  { value: 'ghost_kitchen', label: 'Ghost Kitchen', icon: <Building2 className="w-6 h-6" />, description: 'Delivery-only commercial kitchen' },
  { value: 'vendor_lot', label: 'Vendor Lot', icon: <MapPin className="w-6 h-6" />, description: 'Prime location for food vendors' },
];

export const StepListingType: React.FC<StepListingTypeProps> = ({
  formData,
  updateField,
  updateCategory,
}) => {
  return (
    <div className="space-y-8">
      {/* Mode Selection */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">What do you want to do?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('mode', option.value)}
              className={cn(
                "p-6 rounded-xl border-2 text-left transition-all",
                formData.mode === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <div className={cn(
                "mb-3",
                formData.mode === option.value ? "text-primary" : "text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <h3 className={cn(
                "font-semibold mb-1",
                formData.mode === option.value ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </h3>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">What are you listing?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categoryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateCategory(option.value)}
              className={cn(
                "p-6 rounded-xl border-2 text-left transition-all",
                formData.category === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <div className={cn(
                "mb-3",
                formData.category === option.value ? "text-primary" : "text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <h3 className={cn(
                "font-semibold mb-1",
                formData.category === option.value ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </h3>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
