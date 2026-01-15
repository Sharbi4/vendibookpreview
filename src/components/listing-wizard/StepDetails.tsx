import React, { useState } from 'react';
import { Plus, X, Sparkles, Loader2, Check, RotateCcw, Package, Scale, Ruler } from 'lucide-react';
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
              className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40"
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
            updateField('description', e.target.value);
            if (showOptimized) setShowOptimized(false);
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

      {/* What's Included - Category-specific amenities */}
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
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.amenities?.includes(item.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
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

      {/* Item Dimensions - Only show for sale listings with mobile assets */}
      {formData.mode === 'sale' && (formData.category === 'food_truck' || formData.category === 'food_trailer') && (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <Label className="text-base font-medium">Item Dimensions</Label>
            <InfoTooltip content="Provide accurate dimensions for freight cost estimates. This helps buyers understand shipping costs." />
          </div>
          <p className="text-sm text-muted-foreground">
            These dimensions are used to calculate accurate freight estimates for buyers.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight_lbs" className="flex items-center gap-1.5 text-sm">
                <Scale className="h-3.5 w-3.5" />
                Weight (lbs)
              </Label>
              <Input
                id="weight_lbs"
                type="number"
                min="0"
                step="1"
                value={formData.weight_lbs}
                onChange={(e) => updateField('weight_lbs', e.target.value)}
                placeholder="e.g., 5000"
              />
            </div>

            {/* Freight Category */}
            <div className="space-y-2">
              <Label htmlFor="freight_category" className="flex items-center gap-1.5 text-sm">
                <Package className="h-3.5 w-3.5" />
                Freight Type
              </Label>
              <Select
                value={formData.freight_category || ''}
                onValueChange={(value) => updateField('freight_category', value as FreightCategory)}
              >
                <SelectTrigger>
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

          <div className="grid grid-cols-3 gap-4">
            {/* Length */}
            <div className="space-y-2">
              <Label htmlFor="length_inches" className="flex items-center gap-1.5 text-sm">
                <Ruler className="h-3.5 w-3.5" />
                Length (in)
              </Label>
              <Input
                id="length_inches"
                type="number"
                min="0"
                step="1"
                value={formData.length_inches}
                onChange={(e) => updateField('length_inches', e.target.value)}
                placeholder="e.g., 240"
              />
            </div>

            {/* Width */}
            <div className="space-y-2">
              <Label htmlFor="width_inches" className="flex items-center gap-1.5 text-sm">
                <Ruler className="h-3.5 w-3.5" />
                Width (in)
              </Label>
              <Input
                id="width_inches"
                type="number"
                min="0"
                step="1"
                value={formData.width_inches}
                onChange={(e) => updateField('width_inches', e.target.value)}
                placeholder="e.g., 96"
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height_inches" className="flex items-center gap-1.5 text-sm">
                <Ruler className="h-3.5 w-3.5" />
                Height (in)
              </Label>
              <Input
                id="height_inches"
                type="number"
                min="0"
                step="1"
                value={formData.height_inches}
                onChange={(e) => updateField('height_inches', e.target.value)}
                placeholder="e.g., 120"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Tip: Typical food truck dimensions are 16-26 ft long (192-312 in), 7-8 ft wide (84-96 in), and 8-10 ft tall (96-120 in).
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
                className="flex items-center gap-2 p-3 bg-muted rounded-lg"
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
