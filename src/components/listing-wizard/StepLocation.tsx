import React, { useState } from 'react';
import { MapPin, Truck, Package, Info, Building2 } from 'lucide-react';
import { ListingFormData, FulfillmentType } from '@/types/listing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LocationMapPreview } from './LocationMapPreview';
import { GpsLocationButton } from './GpsLocationButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Airbnb-style floating label input
const FloatingLabelInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ label, value, onChange, placeholder, className }) => {
  return (
    <div className={cn("relative border border-border rounded-lg focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground transition-all", className)}>
      <label className="absolute left-3 top-2 text-xs text-muted-foreground font-medium">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pt-6 pb-2 px-3 bg-transparent text-foreground text-base outline-none"
      />
    </div>
  );
};

// Airbnb-style floating label select
const FloatingLabelSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ label, value, onChange, options, className }) => {
  return (
    <div className={cn("relative border border-border rounded-lg focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground transition-all", className)}>
      <label className="absolute left-3 top-2 text-xs text-muted-foreground font-medium z-10">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full pt-6 pb-2 px-3 h-auto border-0 bg-transparent text-foreground text-base outline-none focus:ring-0 shadow-none">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const StepLocation: React.FC<StepLocationProps> = ({
  formData,
  updateField,
  isMobileAsset,
  isStaticLocation,
  isCategoryStaticLocation,
  onToggleStaticLocation,
}) => {
  // Track validation state for location (from map preview)
  const [isLocationValid, setIsLocationValid] = useState(false);
  const [locationCoordinates, setLocationCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Static location - Airbnb-style structured address form
  if (isStaticLocation) {
    return (
      <div className="space-y-8 max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Confirm your address</h2>
          <p className="text-muted-foreground">
            Your address is only shared with guests after they've made a reservation.
          </p>
          <div className="pt-2">
            <GpsLocationButton
              onLocationDetected={(loc) => {
                updateField('street_address', loc.street_address);
                updateField('city', loc.city);
                updateField('state', loc.state);
                updateField('zip_code', loc.zip_code);
                updateField('country', loc.country);
              }}
            />
          </div>
        </div>

        {/* Structured Address Form - Old School Style with Validation */}
        <div className="space-y-0">
          {/* Country/Region */}
          <FloatingLabelSelect
            label="Country / region"
            value={formData.country || 'United States - US'}
            onChange={(value) => updateField('country', value)}
            options={[
              { value: 'United States - US', label: 'United States - US' },
              { value: 'Canada - CA', label: 'Canada - CA' },
              { value: 'Mexico - MX', label: 'Mexico - MX' },
            ]}
            className="rounded-b-none"
          />

          {/* Address Line 1 */}
          <FloatingLabelInput
            label="Address Line 1 *"
            value={formData.street_address}
            onChange={(value) => updateField('street_address', value)}
            placeholder="123 Main Street"
            className={cn(
              "rounded-none border-t-0",
              !formData.street_address.trim() && "border-destructive/50"
            )}
          />

          {/* Address Line 2 */}
          <FloatingLabelInput
            label="Address Line 2 (Optional)"
            value={formData.apt_suite}
            onChange={(value) => updateField('apt_suite', value)}
            placeholder="Apt, Suite, Unit, etc."
            className="rounded-none border-t-0"
          />

          {/* City */}
          <FloatingLabelInput
            label="City *"
            value={formData.city}
            onChange={(value) => updateField('city', value)}
            placeholder="Austin"
            className={cn(
              "rounded-none border-t-0",
              !formData.city.trim() && "border-destructive/50"
            )}
          />

          {/* State & ZIP in 2-column layout */}
          <div className="grid grid-cols-2">
            <FloatingLabelSelect
              label="State *"
              value={formData.state}
              onChange={(value) => updateField('state', value)}
              options={US_STATES.map(s => ({ value: s, label: s }))}
              className={cn(
                "rounded-none border-t-0 rounded-bl-lg",
                !formData.state && "border-destructive/50"
              )}
            />
            <FloatingLabelInput
              label="ZIP Code *"
              value={formData.zip_code}
              onChange={(value) => updateField('zip_code', value)}
              placeholder="78701"
              className={cn(
                "rounded-none border-t-0 border-l-0 rounded-br-lg",
                !formData.zip_code.trim() && "border-destructive/50"
              )}
            />
          </div>
        </div>
        
        {/* Validation Message */}
        {(!formData.street_address.trim() || !formData.city.trim() || !formData.state || !formData.zip_code.trim()) && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            Please fill in all required address fields
          </p>
        )}

        {/* Map Preview with Google Geocoding */}
        <div className="pt-4 border-t border-border">
          <h4 className="font-medium text-foreground mb-4">Location Preview</h4>
          <LocationMapPreview
            city={formData.city}
            state={formData.state}
            zipCode={formData.zip_code}
            streetAddress={formData.street_address}
            showPreciseLocation={formData.show_precise_location}
            onCoordinatesChange={setLocationCoordinates}
            onValidationChange={setIsLocationValid}
            className="h-48"
          />
        </div>

        {/* Show Precise Location Toggle */}
        <div className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Show your listing's precise location</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Make it clear to guests where your place is located. We'll only share your address after
                they've made a reservation.
              </p>
            </div>
            <Switch
              checked={formData.show_precise_location}
              onCheckedChange={(checked) => updateField('show_precise_location', checked)}
            />
          </div>
        </div>

        {/* Access Instructions */}
        <div className="space-y-2 pt-4 border-t border-border">
          <Label htmlFor="access_instructions" className="text-base font-medium">Access Instructions *</Label>
          <Textarea
            id="access_instructions"
            value={formData.access_instructions}
            onChange={(e) => updateField('access_instructions', e.target.value)}
            placeholder="How do guests access the space? Any gate codes, parking instructions, or check-in procedures?"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Shared with renters after booking. Include gate codes, parking info, and any check-in steps.
          </p>
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
          <p className="text-xs text-muted-foreground">
            Let renters know when they can access the space.
          </p>
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
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Any extra details about utilities, parking, or nearby amenities.
          </p>
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
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Since this is a stationary asset, customers will come to this location. Provide the address and access details below.
              </p>
              <div className="mt-2">
                <GpsLocationButton
                  onLocationDetected={(loc) => {
                    updateField('street_address', loc.street_address);
                    updateField('city', loc.city);
                    updateField('state', loc.state);
                    updateField('zip_code', loc.zip_code);
                    updateField('country', loc.country);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Full Structured Address Form - Old School Style with Validation */}
          <div className="max-w-xl space-y-0">
            <FloatingLabelSelect
              label="Country / region"
              value={formData.country || 'United States - US'}
              onChange={(value) => updateField('country', value)}
              options={[
                { value: 'United States - US', label: 'United States - US' },
                { value: 'Canada - CA', label: 'Canada - CA' },
                { value: 'Mexico - MX', label: 'Mexico - MX' },
              ]}
              className="rounded-b-none"
            />

            <FloatingLabelInput
              label="Address Line 1 *"
              value={formData.street_address}
              onChange={(value) => updateField('street_address', value)}
              placeholder="123 Main Street"
              className={cn(
                "rounded-none border-t-0",
                !formData.street_address.trim() && "border-destructive/50"
              )}
            />

            <FloatingLabelInput
              label="Address Line 2 (Optional)"
              value={formData.apt_suite}
              onChange={(value) => updateField('apt_suite', value)}
              placeholder="Apt, Suite, Unit, etc."
              className="rounded-none border-t-0"
            />

            <FloatingLabelInput
              label="City *"
              value={formData.city}
              onChange={(value) => updateField('city', value)}
              placeholder="Austin"
              className={cn(
                "rounded-none border-t-0",
                !formData.city.trim() && "border-destructive/50"
              )}
            />

            <div className="grid grid-cols-2">
              <FloatingLabelSelect
                label="State *"
                value={formData.state}
                onChange={(value) => updateField('state', value)}
                options={US_STATES.map(s => ({ value: s, label: s }))}
                className={cn(
                  "rounded-none border-t-0 rounded-bl-lg",
                  !formData.state && "border-destructive/50"
                )}
              />
              <FloatingLabelInput
                label="ZIP Code *"
                value={formData.zip_code}
                onChange={(value) => updateField('zip_code', value)}
                placeholder="78701"
                className={cn(
                  "rounded-none border-t-0 border-l-0 rounded-br-lg",
                  !formData.zip_code.trim() && "border-destructive/50"
                )}
              />
            </div>
          </div>
          
          {/* Validation Message */}
          {(!formData.street_address.trim() || !formData.city.trim() || !formData.state || !formData.zip_code.trim()) && (
            <div className="max-w-xl">
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Please fill in all required address fields
              </p>
            </div>
          )}

          {/* Map Preview with Google Geocoding */}
          <div className="max-w-xl">
            <h4 className="font-medium text-foreground mb-4">Location Preview</h4>
            <LocationMapPreview
              city={formData.city}
              state={formData.state}
              zipCode={formData.zip_code}
              streetAddress={formData.street_address}
              showPreciseLocation={formData.show_precise_location}
              onCoordinatesChange={setLocationCoordinates}
              onValidationChange={setIsLocationValid}
              className="h-48"
            />
          </div>

          {/* Show Precise Location Toggle */}
          <div className="pt-4 max-w-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Show your listing's precise location</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Make it clear to guests where your place is located. We'll only share your address after
                  they've made a reservation.
                </p>
              </div>
              <Switch
                checked={formData.show_precise_location}
                onCheckedChange={(checked) => updateField('show_precise_location', checked)}
              />
            </div>
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
              className="resize-none"
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
              className="resize-none"
            />
          </div>
        </div>
      )}

      {/* Show mobile fulfillment options if NOT static */}
      {!formData.is_static_location && (
        <>
          {/* Fulfillment Type - Cards with inline fields */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Fulfillment Options *</Label>
            <div className="space-y-3">
              {fulfillmentOptions.map((option) => {
                const isSelected = formData.fulfillment_type === option.value;
                const showPickupFields = isSelected && (option.value === 'pickup' || option.value === 'both');
                const showDeliveryFields = isSelected && (option.value === 'delivery' || option.value === 'both');
                
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "rounded-xl border-2 transition-all overflow-hidden",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    {/* Option Header */}
                    <button
                      type="button"
                      onClick={() => updateField('fulfillment_type', option.value)}
                      className="w-full p-4 text-left flex items-start gap-3"
                    >
                      <div className={cn(
                        "mt-0.5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}>
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className={cn(
                          "font-medium",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {option.label}
                        </h4>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                    
                    {/* Inline Fields - Pickup */}
                    {showPickupFields && (
                      <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 animate-in fade-in-50 duration-200">
                        <div className="space-y-4">
                          <Label className="text-sm font-medium">
                            {option.value === 'both' ? 'Pickup Location' : 'Location'} *
                          </Label>
                          
                          {/* Full Structured Address Fields - Old School Style */}
                          <div className="space-y-0">
                            <FloatingLabelInput
                              label="Address Line 1 *"
                              value={formData.street_address}
                              onChange={(value) => updateField('street_address', value)}
                              placeholder="123 Main Street"
                              className={cn(
                                "rounded-b-none",
                                !formData.street_address.trim() && "border-destructive/50"
                              )}
                            />
                            <FloatingLabelInput
                              label="Address Line 2 (Optional)"
                              value={formData.apt_suite}
                              onChange={(value) => updateField('apt_suite', value)}
                              placeholder="Apt, Suite, Unit, etc."
                              className="rounded-none border-t-0"
                            />
                            <FloatingLabelInput
                              label="City *"
                              value={formData.city}
                              onChange={(value) => updateField('city', value)}
                              placeholder="Austin"
                              className={cn(
                                "rounded-none border-t-0",
                                !formData.city.trim() && "border-destructive/50"
                              )}
                            />
                            <div className="grid grid-cols-2">
                              <FloatingLabelSelect
                                label="State *"
                                value={formData.state}
                                onChange={(value) => updateField('state', value)}
                                options={US_STATES.map(s => ({ value: s, label: s }))}
                                className={cn(
                                  "rounded-none border-t-0 rounded-bl-lg",
                                  !formData.state && "border-destructive/50"
                                )}
                              />
                              <FloatingLabelInput
                                label="ZIP Code *"
                                value={formData.zip_code}
                                onChange={(value) => updateField('zip_code', value)}
                                placeholder="78701"
                                className={cn(
                                  "rounded-none border-t-0 border-l-0 rounded-br-lg",
                                  !formData.zip_code.trim() && "border-destructive/50"
                                )}
                              />
                            </div>
                          </div>
                          
                          {/* Validation Messages */}
                          {(!formData.street_address.trim() || !formData.city.trim() || !formData.state || !formData.zip_code.trim()) && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              Please fill in all required address fields
                            </p>
                          )}
                          
                          {/* Map Preview */}
                          <LocationMapPreview
                            city={formData.city}
                            state={formData.state}
                            zipCode={formData.zip_code}
                            streetAddress={formData.street_address}
                            showPreciseLocation={false}
                            onCoordinatesChange={setLocationCoordinates}
                            onValidationChange={setIsLocationValid}
                            className="h-48"
                          />
                          
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Approximate area shown. Exact address shared after booking.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pickup_instructions" className="text-sm font-medium">
                            Pickup Instructions
                          </Label>
                          <Textarea
                            id="pickup_instructions"
                            value={formData.pickup_instructions}
                            onChange={(e) => updateField('pickup_instructions', e.target.value)}
                            placeholder="Any special instructions for pickup?"
                            rows={2}
                            className="resize-none"
                          />
                          <p className="text-xs text-muted-foreground">
                            Shared with renters after booking confirmation.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Inline Fields - Delivery */}
                    {showDeliveryFields && (
                      <div className={cn(
                        "px-4 pb-4 space-y-4 animate-in fade-in-50 duration-200",
                        showPickupFields ? "pt-4 border-t border-border/50" : "pt-2 border-t border-border/50"
                      )}>
                        {/* Base Location for Delivery Only */}
                        {option.value === 'delivery' && (
                          <div className="space-y-4">
                            <Label className="text-sm font-medium">
                              Your Base Location *
                            </Label>
                            
                            {/* Full Structured Address Fields - Old School Style */}
                            <div className="space-y-0">
                              <FloatingLabelInput
                                label="Address Line 1 *"
                                value={formData.street_address}
                                onChange={(value) => updateField('street_address', value)}
                                placeholder="123 Main Street"
                                className={cn(
                                  "rounded-b-none",
                                  !formData.street_address.trim() && "border-destructive/50"
                                )}
                              />
                              <FloatingLabelInput
                                label="Address Line 2 (Optional)"
                                value={formData.apt_suite}
                                onChange={(value) => updateField('apt_suite', value)}
                                placeholder="Apt, Suite, Unit, etc."
                                className="rounded-none border-t-0"
                              />
                              <FloatingLabelInput
                                label="City *"
                                value={formData.city}
                                onChange={(value) => updateField('city', value)}
                                placeholder="Austin"
                                className={cn(
                                  "rounded-none border-t-0",
                                  !formData.city.trim() && "border-destructive/50"
                                )}
                              />
                              <div className="grid grid-cols-2">
                                <FloatingLabelSelect
                                  label="State *"
                                  value={formData.state}
                                  onChange={(value) => updateField('state', value)}
                                  options={US_STATES.map(s => ({ value: s, label: s }))}
                                  className={cn(
                                    "rounded-none border-t-0 rounded-bl-lg",
                                    !formData.state && "border-destructive/50"
                                  )}
                                />
                                <FloatingLabelInput
                                  label="ZIP Code *"
                                  value={formData.zip_code}
                                  onChange={(value) => updateField('zip_code', value)}
                                  placeholder="78701"
                                  className={cn(
                                    "rounded-none border-t-0 border-l-0 rounded-br-lg",
                                    !formData.zip_code.trim() && "border-destructive/50"
                                  )}
                                />
                              </div>
                            </div>
                            
                            {/* Validation Messages */}
                            {(!formData.street_address.trim() || !formData.city.trim() || !formData.state || !formData.zip_code.trim()) && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Please fill in all required address fields
                              </p>
                            )}
                            
                            {/* Map Preview */}
                            <LocationMapPreview
                              city={formData.city}
                              state={formData.state}
                              zipCode={formData.zip_code}
                              streetAddress={formData.street_address}
                              showPreciseLocation={false}
                              onCoordinatesChange={setLocationCoordinates}
                              onValidationChange={setIsLocationValid}
                              className="h-48"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="delivery_fee" className="text-sm font-medium">Delivery Fee</Label>
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
                            <p className="text-xs text-muted-foreground">
                              One-time fee added to bookings with delivery.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="delivery_radius_miles" className="text-sm font-medium">Radius</Label>
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
                            <p className="text-xs text-muted-foreground">
                              Max distance you'll deliver from your location.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="delivery_instructions" className="text-sm font-medium">
                            Delivery Instructions
                          </Label>
                          <Textarea
                            id="delivery_instructions"
                            value={formData.delivery_instructions}
                            onChange={(e) => updateField('delivery_instructions', e.target.value)}
                            placeholder="Any special requirements for delivery?"
                            rows={2}
                            className="resize-none"
                          />
                          <p className="text-xs text-muted-foreground">
                            Include timing, access requirements, or setup expectations.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
