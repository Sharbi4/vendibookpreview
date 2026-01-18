import React, { useState } from 'react';
import { MapPin, Truck, Package, Info, Building2 } from 'lucide-react';
import { ListingFormData, FulfillmentType } from '@/types/listing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';

interface StepLocationProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  isMobileAsset: boolean;
  isStaticLocation: boolean;
  isCategoryStaticLocation: boolean;
  onToggleStaticLocation: (isStatic: boolean) => void;
}

const fulfillmentOptions: { value: FulfillmentType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'pickup', label: 'Pickup Only', icon: <MapPin className="w-5 h-5" />, description: 'Buyer/renter picks up from your location' },
  { value: 'delivery', label: 'Delivery Only', icon: <Truck className="w-5 h-5" />, description: 'You deliver to their location' },
  { value: 'both', label: 'Pickup + Delivery', icon: <Package className="w-5 h-5" />, description: 'Offer both options' },
];

export const StepLocation: React.FC<StepLocationProps> = ({
  formData,
  updateField,
  isMobileAsset,
  isStaticLocation,
  isCategoryStaticLocation,
  onToggleStaticLocation,
}) => {
  // Track selected coordinates for location inputs (not persisted, just for UI validation)
  const [pickupCoordinates, setPickupCoordinates] = useState<[number, number] | null>(null);
  if (isStaticLocation) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-card border border-border rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            This is a fixed on-site location. Customers will come to this address.
          </p>
        </div>

        {/* Full Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="text-base font-medium">Full Address *</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 Main Street, Suite 100, City, State ZIP"
            rows={2}
          />
        </div>

        {/* Access Instructions */}
        <div className="space-y-2">
          <Label htmlFor="access_instructions" className="text-base font-medium">Access Instructions *</Label>
          <Textarea
            id="access_instructions"
            value={formData.access_instructions}
            onChange={(e) => updateField('access_instructions', e.target.value)}
            placeholder="How do guests access the space? Any gate codes, parking instructions, or check-in procedures?"
            rows={3}
          />
        </div>

        {/* Hours of Access */}
        <div className="space-y-2">
          <Label htmlFor="hours_of_access" className="text-base font-medium">Hours of Access (Optional)</Label>
          <Input
            id="hours_of_access"
            value={formData.hours_of_access}
            onChange={(e) => updateField('hours_of_access', e.target.value)}
            placeholder="e.g., 6 AM - 10 PM daily"
          />
        </div>

        {/* Location Notes */}
        <div className="space-y-2">
          <Label htmlFor="location_notes" className="text-base font-medium">Additional Notes (Optional)</Label>
          <Textarea
            id="location_notes"
            value={formData.location_notes}
            onChange={(e) => updateField('location_notes', e.target.value)}
            placeholder="Utilities included, parking availability, nearby amenities..."
            rows={3}
          />
        </div>
      </div>
    );
  }

  // Mobile Asset (Food Truck / Trailer) - with option to mark as static
  return (
    <div className="space-y-6">
      {/* Static Location Toggle - Only show for mobile assets that aren't inherently static */}
      {isMobileAsset && !isCategoryStaticLocation && (
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="static-toggle" className="text-base font-medium cursor-pointer">
                  Static Location
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  This asset is parked at a fixed location (e.g., permanently stationed at a venue, lot, or property)
                </p>
              </div>
            </div>
            <Switch
              id="static-toggle"
              checked={formData.is_static_location}
              onCheckedChange={onToggleStaticLocation}
            />
          </div>
        </div>
      )}

      {/* Show static location fields if toggled on */}
      {formData.is_static_location && !isCategoryStaticLocation && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl flex items-start gap-3 border border-amber-200 dark:border-amber-800">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Since this is a stationary asset, customers will come to this location. Provide the address and access details below.
            </p>
          </div>

          {/* Full Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-base font-medium">Full Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main Street, Suite 100, City, State ZIP"
              rows={2}
            />
          </div>

          {/* Access Instructions */}
          <div className="space-y-2">
            <Label htmlFor="access_instructions" className="text-base font-medium">Access Instructions *</Label>
            <Textarea
              id="access_instructions"
              value={formData.access_instructions}
              onChange={(e) => updateField('access_instructions', e.target.value)}
              placeholder="How do guests access the asset? Any gate codes, parking instructions, or check-in procedures?"
              rows={3}
            />
          </div>

          {/* Hours of Access */}
          <div className="space-y-2">
            <Label htmlFor="hours_of_access" className="text-base font-medium">Hours of Access (Optional)</Label>
            <Input
              id="hours_of_access"
              value={formData.hours_of_access}
              onChange={(e) => updateField('hours_of_access', e.target.value)}
              placeholder="e.g., 6 AM - 10 PM daily"
            />
          </div>

          {/* Location Notes */}
          <div className="space-y-2">
            <Label htmlFor="location_notes" className="text-base font-medium">Additional Notes (Optional)</Label>
            <Textarea
              id="location_notes"
              value={formData.location_notes}
              onChange={(e) => updateField('location_notes', e.target.value)}
              placeholder="Utilities included, parking availability, nearby amenities..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Show mobile fulfillment options if NOT static */}
      {!formData.is_static_location && (
        <>
          {/* Fulfillment Type */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Fulfillment Options *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fulfillmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('fulfillment_type', option.value)}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all",
                formData.fulfillment_type === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <div className={cn(
                "mb-2",
                formData.fulfillment_type === option.value ? "text-primary" : "text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <h4 className={cn(
                "font-medium text-sm",
                formData.fulfillment_type === option.value ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pickup Location */}
      {(formData.fulfillment_type === 'pickup' || formData.fulfillment_type === 'both') && (
        <>
          <div className="space-y-2">
            <Label htmlFor="pickup_location_text" className="text-base font-medium">Pickup Location *</Label>
            <LocationSearchInput
              value={formData.pickup_location_text}
              onChange={(value) => updateField('pickup_location_text', value)}
              onLocationSelect={(location) => {
                if (location) {
                  setPickupCoordinates(location.coordinates);
                } else {
                  setPickupCoordinates(null);
                }
              }}
              selectedCoordinates={pickupCoordinates}
              placeholder="City, State (e.g., Austin, TX)"
            />
            <p className="text-sm text-muted-foreground">
              Enter a general area. Exact address shared after booking.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup_instructions" className="text-base font-medium">Pickup Instructions (Optional)</Label>
            <Textarea
              id="pickup_instructions"
              value={formData.pickup_instructions}
              onChange={(e) => updateField('pickup_instructions', e.target.value)}
              placeholder="Any special instructions for pickup?"
              rows={2}
            />
          </div>
        </>
      )}

      {/* Delivery Options */}
      {(formData.fulfillment_type === 'delivery' || formData.fulfillment_type === 'both') && (
        <>
          {formData.fulfillment_type === 'delivery' && (
            <div className="space-y-2">
              <Label htmlFor="pickup_location_text" className="text-base font-medium">Your Base Location *</Label>
              <LocationSearchInput
                value={formData.pickup_location_text}
                onChange={(value) => updateField('pickup_location_text', value)}
                onLocationSelect={(location) => {
                  if (location) {
                    setPickupCoordinates(location.coordinates);
                  } else {
                    setPickupCoordinates(null);
                  }
                }}
                selectedCoordinates={pickupCoordinates}
                placeholder="City, State (e.g., Austin, TX)"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_fee" className="text-base font-medium">Delivery Fee (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="delivery_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => updateField('delivery_fee', e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_radius_miles" className="text-base font-medium">Delivery Radius (Optional)</Label>
              <div className="relative">
                <Input
                  id="delivery_radius_miles"
                  type="number"
                  min="0"
                  value={formData.delivery_radius_miles}
                  onChange={(e) => updateField('delivery_radius_miles', e.target.value)}
                  placeholder="50"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">miles</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_instructions" className="text-base font-medium">Delivery Instructions (Optional)</Label>
            <Textarea
              id="delivery_instructions"
              value={formData.delivery_instructions}
              onChange={(e) => updateField('delivery_instructions', e.target.value)}
              placeholder="Any special requirements for delivery?"
              rows={2}
            />
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
};
