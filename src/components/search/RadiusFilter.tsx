import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface RadiusFilterProps {
  radius: number;
  onChange: (radius: number) => void;
  disabled?: boolean;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250];

export const RadiusFilter: React.FC<RadiusFilterProps> = ({
  radius,
  onChange,
  disabled = false,
}) => {
  // Find closest preset value for slider
  const sliderValue = RADIUS_OPTIONS.indexOf(
    RADIUS_OPTIONS.reduce((prev, curr) => 
      Math.abs(curr - radius) < Math.abs(prev - radius) ? curr : prev
    )
  );

  const handleSliderChange = (value: number[]) => {
    onChange(RADIUS_OPTIONS[value[0]]);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Search Radius
      </Label>
      
      {disabled ? (
        <p className="text-xs text-muted-foreground">
          Select a location to enable radius search
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {RADIUS_OPTIONS.map((r) => (
              <Badge
                key={r}
                variant={radius === r ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => onChange(r)}
              >
                {r} mi
              </Badge>
            ))}
          </div>
          
          <div className="px-2">
            <Slider
              value={[sliderValue]}
              min={0}
              max={RADIUS_OPTIONS.length - 1}
              step={1}
              onValueChange={handleSliderChange}
              className="my-2"
            />
            <div className="text-center text-sm font-medium text-primary">
              {radius} miles
            </div>
          </div>
        </>
      )}
    </div>
  );
};
