import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { ListingFormData } from '@/types/listing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface StepDetailsProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
}

export const StepDetails: React.FC<StepDetailsProps> = ({
  formData,
  updateField,
}) => {
  const [newHighlight, setNewHighlight] = useState('');

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

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe your listing in detail. What makes it special? What equipment is included? What's the condition?"
          rows={6}
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground">
          Be detailed! Buyers and renters want to know everything about your asset.
        </p>
      </div>

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
