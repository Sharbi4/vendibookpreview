import React, { useEffect } from 'react';
import { Truck, Store, Building2, MapPin, Tag, ShoppingBag, Users } from 'lucide-react';
import { ListingFormData, ListingMode, ListingCategory, CATEGORY_LABELS, SUBCATEGORIES_BY_CATEGORY } from '@/types/listing';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  { value: 'ghost_kitchen', label: 'Shared Kitchen', icon: <Building2 className="w-6 h-6" />, description: 'Commercial kitchen space for rent' },
  { value: 'vendor_space', label: 'Vendor Space', icon: <MapPin className="w-6 h-6" />, description: 'Prime location for food vendors' },
];

// Categories that only support rental (no sale option)
const RENTAL_ONLY_CATEGORIES: ListingCategory[] = ['vendor_space', 'vendor_lot', 'ghost_kitchen'];

export const StepListingType: React.FC<StepListingTypeProps> = ({
  formData,
  updateField,
  updateCategory,
}) => {
  const isRentalOnlyCategory = formData.category && RENTAL_ONLY_CATEGORIES.includes(formData.category);

  // Auto-set mode to 'rent' when a rental-only category is selected
  useEffect(() => {
    if (isRentalOnlyCategory && formData.mode !== 'rent') {
      updateField('mode', 'rent');
    }
  }, [formData.category, formData.mode, isRentalOnlyCategory, updateField]);

  // Filter mode options based on category
  const availableModeOptions = isRentalOnlyCategory 
    ? modeOptions.filter(opt => opt.value === 'rent')
    : modeOptions;

  return (
    <div className="space-y-8">
      {/* Mode Selection */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">What do you want to do?</Label>
        {isRentalOnlyCategory && (
          <p className="text-sm text-muted-foreground -mt-2">
            {CATEGORY_LABELS[formData.category!]} listings are available for rent only.
          </p>
        )}
        <div className={cn(
          "grid gap-4",
          availableModeOptions.length === 1 ? "grid-cols-1 max-w-md" : "grid-cols-1 sm:grid-cols-2"
        )}>
          {availableModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('mode', option.value)}
              className={cn(
                "p-6 rounded-2xl border-0 shadow-xl text-left transition-all bg-card",
                formData.mode === option.value
                  ? "ring-2 ring-primary"
                  : "hover:shadow-2xl"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                formData.mode === option.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                "p-6 rounded-2xl border-0 shadow-xl text-left transition-all bg-card",
                formData.category === option.value
                  ? "ring-2 ring-primary"
                  : "hover:shadow-2xl"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                formData.category === option.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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

      {/* Subcategory Selection - appears after category is selected */}
      {formData.category && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <Label className="text-lg font-semibold">What type of {CATEGORY_LABELS[formData.category]}?</Label>
            <span className="text-sm text-muted-foreground">(Optional)</span>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {SUBCATEGORIES_BY_CATEGORY[formData.category].map((sub) => (
              <button
                key={sub.value}
                type="button"
                onClick={() => updateField('subcategory', 
                  formData.subcategory === sub.value ? null : sub.value
                )}
                className={cn(
                  "px-4 py-2.5 rounded-full border text-sm font-medium transition-all",
                  formData.subcategory === sub.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>
          
          {/* Show description of selected subcategory */}
          {formData.subcategory && (
            <p className="text-sm text-muted-foreground pl-1">
              {SUBCATEGORIES_BY_CATEGORY[formData.category].find(
                s => s.value === formData.subcategory
              )?.description}
            </p>
          )}
        </div>
      )}

      {/* Total Slots Input - Vendor Space only */}
      {(formData.category === 'vendor_space' || formData.category === 'vendor_lot') && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <Label className="text-lg font-semibold">Total Slots Available</Label>
          </div>
          <div className="p-6 rounded-2xl border-0 shadow-xl bg-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  How many vendors can book this space at the same time? This enables capacity-based availability.
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.total_slots}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 1) {
                        updateField('total_slots', value);
                      }
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    slot{formData.total_slots !== 1 ? 's' : ''}
                  </span>
                </div>
                {formData.total_slots > 1 && (
                  <p className="text-xs text-primary font-medium">
                    ✓ Multiple vendors can book the same dates
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
