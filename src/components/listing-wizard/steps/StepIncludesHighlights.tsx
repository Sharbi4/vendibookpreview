import React, { useState } from 'react';
import { Plus, X, CheckCircle2, Star, Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AMENITIES_BY_CATEGORY, ListingCategory } from '@/types/listing';

interface StepIncludesHighlightsProps {
  category: ListingCategory | null;
  amenities: string[];
  highlights: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  onHighlightsChange: (highlights: string[]) => void;
}

export const StepIncludesHighlights: React.FC<StepIncludesHighlightsProps> = ({
  category,
  amenities,
  highlights,
  onAmenitiesChange,
  onHighlightsChange,
}) => {
  const [newHighlight, setNewHighlight] = useState('');

  const categoryAmenities = category 
    ? AMENITIES_BY_CATEGORY[category] 
    : [];

  const toggleAmenity = (amenityId: string) => {
    if (amenities.includes(amenityId)) {
      onAmenitiesChange(amenities.filter(a => a !== amenityId));
    } else {
      onAmenitiesChange([...amenities, amenityId]);
    }
  };

  const addHighlight = () => {
    if (newHighlight.trim() && highlights.length < 6) {
      onHighlightsChange([...highlights, newHighlight.trim()]);
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    onHighlightsChange(highlights.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHighlight();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">What's included?</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Help renters understand exactly what they're getting.
        </p>
      </div>

      {/* Amenities */}
      {categoryAmenities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold text-foreground">Equipment & Features</Label>
            </div>
            {amenities.length > 0 && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                {amenities.length} selected
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {categoryAmenities.map((group) => (
              <div key={group.label} className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        amenities.includes(item.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40'
                      )}
                    >
                      <Checkbox
                        checked={amenities.includes(item.id)}
                        onCheckedChange={() => toggleAmenity(item.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Highlights */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">Key Highlights</Label>
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Add up to 6 bullet points to showcase the best features.
        </p>
        
        {highlights.length > 0 && (
          <ul className="space-y-2">
            {highlights.map((highlight, index) => (
              <li
                key={index}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
              >
                <Star className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">{highlight}</span>
                <button
                  type="button"
                  onClick={() => removeHighlight(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-destructive/10 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {highlights.length < 6 && (
          <div className="flex gap-2">
            <Input
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Brand new commercial refrigeration"
              className="flex-1 bg-background"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addHighlight}
              disabled={!newHighlight.trim()}
              className="shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {highlights.length >= 6 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Maximum of 6 highlights reached.
          </p>
        )}
      </div>
    </div>
  );
};
