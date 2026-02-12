import React, { useState } from 'react';
import { Plus, X, Sparkles, Loader2, Check, RotateCcw, Ruler, Grid3X3 } from 'lucide-react';
import { ListingFormData, AMENITIES_BY_CATEGORY, ListingCategory, FREIGHT_CATEGORY_LABELS, FreightCategory } from '@/types/listing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

interface StepDetailsProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
}

export const StepDetails: React.FC<StepDetailsProps> = ({
  formData,
  updateField,
}) => {
  const { toast } = useToast();
  const [newHighlight, setNewHighlight] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [originalDescription, setOriginalDescription] = useState<string | null>(null);
  const [showOptimized, setShowOptimized] = useState(false);

  const addHighlight = () => {
    if (newHighlight.trim() && formData.highlights.length < 6) {
      updateField('highlights', [...formData.highlights, newHighlight.trim()]);
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    updateField('highlights', formData.highlights.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHighlight();
    }
  };

  const toggleAmenity = (amenityId: string) => {
    const current = formData.amenities || [];
    if (current.includes(amenityId)) {
      updateField('amenities', current.filter(a => a !== amenityId));
    } else {
      updateField('amenities', [...current, amenityId]);
    }
  };

  const optimizeDescription = async () => {
    if (!formData.description || formData.description.trim().length < 10) {
      toast({
        title: 'Description too short',
        description: 'Please write at least 10 characters to optimize.',
        variant: 'destructive',
      });
      return;
    }

    setIsOptimizing(true);
    setOriginalDescription(formData.description);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-description', {
        body: {
          rawDescription: formData.description,
          category: formData.category,
          mode: formData.mode,
          title: formData.title,
        },
      });

      if (error) throw error;

      if (data?.optimizedDescription) {
        updateField('description', data.optimizedDescription);
        setShowOptimized(true);
        toast({
          title: 'Description optimized!',
          description: 'Your listing description has been professionally rewritten.',
        });
      }
    } catch (error) {
      console.error('Error optimizing description:', error);
      toast({
        title: 'Optimization failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const revertDescription = () => {
    if (originalDescription) {
      updateField('description', originalDescription);
      setOriginalDescription(null);
      setShowOptimized(false);
      toast({
        title: 'Description reverted',
        description: 'Your original description has been restored.',
      });
    }
  };

  // Get amenities for the selected category
  const categoryAmenities = formData.category 
    ? AMENITIES_BY_CATEGORY[formData.category as ListingCategory] 
    : [];

  // Check if category supports multiple slots (shared kitchens, vendor spaces)
  const supportsMultipleSlots = ['ghost_kitchen', 'vendor_space', 'vendor_lot'].includes(formData.category || '');

  // Auto-resize slot_names when total_slots changes
  const handleTotalSlotsChange = (newCount: number) => {
    updateField('total_slots', newCount);
    const currentNames = formData.slot_names || [];
    if (newCount > currentNames.length) {
      const newNames = [...currentNames];
      for (let i = currentNames.length; i < newCount; i++) {
        newNames.push(`Slot ${i + 1}`);
      }
      updateField('slot_names', newNames);
    } else if (newCount < currentNames.length) {
      updateField('slot_names', currentNames.slice(0, newCount));
    }
  };

  const updateSlotName = (index: number, name: string) => {
    const newNames = [...(formData.slot_names || [])];
    newNames[index] = name;
    updateField('slot_names', newNames);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="title" className="text-base font-medium">Listing Title</Label>
          <span className="text-sm text-muted-foreground">
            {formData.title.length}/80
          </span>
        </div>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value.slice(0, 80))}
          placeholder="e.g., 2022 Fully Equipped Taco Truck"
          className="text-lg"
        />
        <p className="text-sm text-muted-foreground">
          Make it catchy and descriptive. Include key details like year, type, or specialty.
        </p>
      </div>

      {/* Description with AI Builder */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="description" className="text-base font-medium">Description</Label>
          <div className="flex items-center gap-2">
            {showOptimized && originalDescription && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={revertDescription}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Revert
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={optimizeDescription}
              disabled={isOptimizing || !formData.description || formData.description.length < 10}
              className="bg-card border-border hover:border-primary"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Optimizing...
                </>
              ) : showOptimized ? (
                <>
                  <Check className="w-3 h-3 mr-1 text-green-500" />
                  Optimized
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Optimize
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log('[StepDetails] Description onChange - updating to:', newValue.substring(0, 50) + (newValue.length > 50 ? '...' : ''));
            updateField('description', newValue);
            if (showOptimized) setShowOptimized(false);
          }}
          onBlur={() => {
            console.log('[StepDetails] Description onBlur - current value length:', formData.description.length);
          }}
          placeholder="Describe your listing in detail. What makes it special? What equipment is included? What's the condition?"
          rows={6}
          className="resize-none"
        />
        
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Be detailed! Buyers and renters want to know everything about your asset.
          </p>
          {!showOptimized && formData.description.length >= 10 && (
            <p className="text-xs text-muted-foreground/70 whitespace-nowrap">
              ✨ Tip: Click AI Optimize for a professional rewrite
            </p>
          )}
        </div>
      </div>

      {/* Capacity / Slots Section - For shared kitchens and vendor spaces */}
      {supportsMultipleSlots && formData.mode === 'rent' && (
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Capacity & Slots
          </Label>
          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="total_slots" className="text-sm font-medium">Total Available Workstations/Spots</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  How many separate bookings can occur at the same time? (e.g., 3 prep stations)
                </p>
              </div>
              <div className="w-full sm:w-24">
                <Input
                  id="total_slots"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.total_slots || 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 100) {
                      handleTotalSlotsChange(val);
                    }
                  }}
                  className="bg-background text-center text-lg font-semibold"
                />
              </div>
            </div>

            {/* Slot Names */}
            {formData.total_slots > 1 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label className="text-sm font-medium">Name Each Slot</Label>
                <p className="text-xs text-muted-foreground">
                  Give each slot a unique name so renters can identify them (e.g., "Bay A", "Prep Station 2").
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: formData.total_slots }, (_, i) => (
                    <Input
                      key={i}
                      value={(formData.slot_names || [])[i] || `Slot ${i + 1}`}
                      onChange={(e) => updateSlotName(i, e.target.value)}
                      placeholder={`Slot ${i + 1}`}
                      className="bg-background"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Operating hours reminder */}
            {formData.total_slots >= 1 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                ⏰ You'll need to configure operating hours in the Availability step before publishing.
              </p>
            )}
          </div>
        </div>
      )}
      {categoryAmenities.length > 0 && (
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">What's Included</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Select all features and amenities that come with your listing.
            </p>
          </div>
          
          <div className="space-y-6">
            {categoryAmenities.map((group) => (
              <div key={group.label} className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">{group.label}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        formData.amenities?.includes(item.id)
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <Checkbox
                        checked={formData.amenities?.includes(item.id) || false}
                        onCheckedChange={() => toggleAmenity(item.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {formData.amenities && formData.amenities.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {formData.amenities.length} item{formData.amenities.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {/* Physical Specifications - Consolidated "Spec Sheet" */}
      {formData.mode === 'sale' && (formData.category === 'food_truck' || formData.category === 'food_trailer') && (
        <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <Label className="text-base font-semibold">Physical Specifications</Label>
              <p className="text-xs text-muted-foreground">Required for shipping estimates</p>
            </div>
          </div>
          
          {/* 4-Column Dimensions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="length_inches" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Length
              </Label>
              <div className="relative">
                <Input
                  id="length_inches"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.length_inches}
                  onChange={(e) => updateField('length_inches', e.target.value)}
                  placeholder="0"
                  className="pr-8 bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="width_inches" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Width
              </Label>
              <div className="relative">
                <Input
                  id="width_inches"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.width_inches}
                  onChange={(e) => updateField('width_inches', e.target.value)}
                  placeholder="0"
                  className="pr-8 bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="height_inches" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Height
              </Label>
              <div className="relative">
                <Input
                  id="height_inches"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.height_inches}
                  onChange={(e) => updateField('height_inches', e.target.value)}
                  placeholder="0"
                  className="pr-8 bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight_lbs" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Weight
              </Label>
              <div className="relative">
                <Input
                  id="weight_lbs"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.weight_lbs}
                  onChange={(e) => updateField('weight_lbs', e.target.value)}
                  placeholder="0"
                  className="pr-8 bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">lbs</span>
              </div>
            </div>
          </div>

          {/* Freight Type Dropdown */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-4">
              <Label htmlFor="freight_category" className="text-sm font-medium whitespace-nowrap">
                Freight Type
              </Label>
              <Select
                value={formData.freight_category || ''}
                onValueChange={(value) => updateField('freight_category', value as FreightCategory)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREIGHT_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Typical food truck dimensions: 16-26 ft long (192-312 in), 7-8 ft wide (84-96 in), 8-10 ft tall (96-120 in)
          </p>
        </div>
      )}

      {/* Highlights */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Key Highlights (Optional)</Label>
        <p className="text-sm text-muted-foreground">
          Add up to 6 bullet points to showcase the best features.
        </p>
        
        {formData.highlights.length > 0 && (
          <ul className="space-y-2">
            {formData.highlights.map((highlight, index) => (
              <li
                key={index}
                className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border"
              >
                <span className="flex-1">{highlight}</span>
                <button
                  type="button"
                  onClick={() => removeHighlight(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {formData.highlights.length < 6 && (
          <div className="flex gap-2">
            <Input
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Brand new refrigeration system"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addHighlight}
              disabled={!newHighlight.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
